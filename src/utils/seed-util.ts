import zlib from "zlib";
import lzma from "lzma-native";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export async function compressData(rawData: string | Buffer) {
    if (process.env.USE_LZMA === "true") {
        return (await lzma.compress(rawData, 9)) as unknown as Buffer;
    } else {
        return await gzip(rawData);
    }
}

export async function decompressData(rawData: string | Buffer) {
    if (process.env.USE_LZMA === "true") {
        return (await lzma.decompress(rawData)) as unknown as string;
    } else {
        return gunzip(rawData);
    }
}

export function compressDataSync(rawData: string | Buffer) {
    if (process.env.USE_LZMA === "true") {
        throw new Error("No synchronous version for lzma?");
    } else {
        return zlib.gzipSync(rawData);
    }
}

export function decompressDataSync(rawData: string | Buffer) {
    if (process.env.USE_LZMA === "true") {
        throw new Error("No synchronous version for lzma?");
    } else {
        return zlib.gunzipSync(rawData);
    }
}
