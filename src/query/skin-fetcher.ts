import {
    Canvas,
    CanvasRenderingContext2D,
    createCanvas,
    loadImage,
} from "canvas";
import { ExpiringCache } from "../utils/expiring-cache.js";
import { simpleRetryer } from "../utils/utils.js";

/**
 *
 * @param {string} url
 * @returns {Promise<any>}
 */
const fetchJson = async (url: string): Promise<any> => {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
        console.error(await res.text(), res.status);
        throw new Error("Invalid Response Code", {
            cause: { code: res.status },
        });
    }
    const json = await res.json();
    return json;
};
/**
 *
 * @param {string} url
 * @returns {Promise<Blob>}
 */
const fetchBlob = async (url: string): Promise<Blob> => {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
        console.error(await res.text(), res.status);
        throw new Error("Invalid Response Code", {
            cause: { code: res.status },
        });
    }
    const blob = await res.blob();
    return blob;
};

const fetchProfile = (username: string) =>
    fetchJson(
        `https://api.mojang.com/users/profiles/minecraft/${username}`
    ) as Promise<{ id: string; name: string }>;

const fetchUUID = (username: string) =>
    fetchJson(
        `https://api.mojang.com/users/profiles/minecraft/${username}`
    ).then((json) => json.id as string);

const fetchSkinURL = (uuid: any) =>
    fetchJson(
        `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
    ).then((json) => {
        const texture = json.properties[0].value;
        const textureJson = JSON.parse(
            Buffer.from(texture, "base64").toString()
        );
        return textureJson.textures.SKIN.url;
    });

const getColorIndices = (x: number, y: number, width: number) => {
    const start = y * (width * 4) + x * 4;
    return { red: start, green: start + 1, blue: start + 2, alpha: start + 3 };
};

/**
 *
 * @param {Canvas} canvas
 * @param {CanvasRenderingContext2D} ctx
 */
const hasTransparency = (canvas: Canvas, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
            const { alpha } = getColorIndices(x, y, canvas.width);
            if (imageData.data[alpha] < 128) {
                return true;
            }
        }
    }
    return false;
};

/**
 *
 * @param {Canvas} canvas
 * @param {CanvasRenderingContext2D} ctx
 */
const resetArea = (canvas: Canvas, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < 16; y++) {
        for (let x = 32; x < 64; x++) {
            const { red, green, blue, alpha } = getColorIndices(
                x,
                y,
                canvas.width
            );
            imageData.data[red] = 0;
            imageData.data[green] = 0;
            imageData.data[blue] = 0;
            imageData.data[alpha] = 0;
        }
    }
};

// TODO: Parse for the entire skin (not just the head)
const getParsedSkin = async (skinBlob: Blob) => {
    const buffer = Buffer.from(await skinBlob.arrayBuffer());
    const image = await loadImage(buffer);
    if (image.width !== 64 || (image.height !== 64 && image.height !== 32))
        throw new Error("Invalid Image Dimensions");
    const canvas1 = createCanvas(64, 64);
    const ctx1 = canvas1.getContext("2d");
    ctx1.imageSmoothingEnabled = false;
    ctx1.drawImage(image, 0, 0);
    if (image.height === 32) {
        if (!hasTransparency(canvas1, ctx1)) {
            resetArea(canvas1, ctx1);
        }
    }
    return canvas1;
};

/**
 *
 * @param {Canvas} skin
 */
const getHead = (skin: Canvas, size = 24) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skin, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(skin, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    return canvas.toBuffer();
};

const getAvatar = async (username: string, size = 24, isUUID = false) => {
    try {
        const uuid = isUUID ? username : await fetchUUID(username);
        const url = await fetchSkinURL(uuid);
        const url2 = new URL(url);
        url2.protocol = "https:";
        const skinBlob = await fetchBlob(url2.href);
        const parsedSkin = await getParsedSkin(skinBlob);
        return getHead(parsedSkin, size);
    } catch (error) {
        console.error(username);
        throw error;
    }
};

const getSkinBlob = async (uuid: string) => {
    const url = await fetchSkinURL(uuid);
    const url2 = new URL(url);
    url2.protocol = "https:";
    const skinBlob = await fetchBlob(url2.href);
    return skinBlob;
};

const getProfile = async (username: string) => {
    const json = await fetchProfile(username);
    return { uuid: json.id, username: json.name };
};

export class MojangFetcher {
    static #instance: MojangFetcher;

    #uuidCache: ExpiringCache<string, { uuid: string; username: string }>;
    #skinCache: ExpiringCache<string, Blob>;
    constructor() {
        this.#uuidCache = new ExpiringCache(1000 * 60 * 10);
        this.#skinCache = new ExpiringCache(1000 * 60 * 5);
    }
    static get instance() {
        if (!this.#instance) return (this.#instance = new MojangFetcher());
        return this.#instance;
    }
    async getProfile(username: string) {
        username = username.toLowerCase();
        const profile = (await this.#uuidCache.getOrFetch(username, () =>
            simpleRetryer(async () => {
                try {
                    return await getProfile(username);
                } catch (error) {
                    if (error?.cause?.code !== 404) throw error;
                    console.error(error);
                    return;
                }
            })
        )) ?? { uuid: "", username: "" };
        return profile;
    }
    async getAvatar(uuid: string, size = 24) {
        const skinBlob = await this.#skinCache.getOrFetch(uuid, () =>
            simpleRetryer(() => getSkinBlob(uuid))
        );
        const parsedSkin = await getParsedSkin(skinBlob);
        return getHead(parsedSkin, size);
    }
}
