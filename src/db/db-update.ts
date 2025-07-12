import db from "./db.js";
import fs from "fs/promises";
import crypto from "crypto";
import zlib from "zlib";
import {
    getGuildEndpointData,
    getHousingEndpointData,
    getPlayerEndpointData,
    getSkyBlockEndpointData,
    PlayerEndpointType,
    PlayerStatsType,
} from "../query/hypixel-fetcher.js";
import { DateTime } from "luxon";
import { promisify } from "util";
import { simpleRetryer, sleep } from "../utils/utils.js";
import { guild, guildStats, player, playerStats } from "./schema.js";
import { eq } from "drizzle-orm";

export async function createGuild(discordGuildID: string, playerUUID: string) {
    const guildData = await getGuildEndpointData(playerUUID, "PLAYER");
    const guild2 = await db
        .insert(guild)
        .values({
            guildIdDiscord: discordGuildID,
            guildIdHypixel: guildData.id,
            name: guildData.name,
            createdAtHypixel: guildData.created.getTime(),
        })
        .returning({
            id: guild.id,
        });
    return { id: guild2[0].id, name: guildData.name };
}

export async function getGuildMemberData<T>(
    uuids: string[],
    func: (arg0: string) => Promise<T>
) {
    const arr: T[] = [];
    for (const uuid of uuids) {
        arr.push(await func(uuid));
    }
    return arr;
}

const gzip = promisify(zlib.gzip);

/**
 * Called 5 minutes before 12:00AM PST/PDT
 *
 */
export async function getGuildData(
    uuid: string,
    waitUntil?: Date,
    housingStore?: Awaited<ReturnType<typeof getHousingEndpointData>>[]
) {
    const getHousingData = async () => {
        if (housingStore?.length !== 0) return housingStore;
        const guildDataOld = await getGuildEndpointData(uuid, "GUILD");
        const housingData = await getGuildMemberData(
            guildDataOld.memberUUIDs,
            (arg0) =>
                simpleRetryer(
                    () => getHousingEndpointData(arg0),
                    5,
                    [1000, 2000]
                )
        );
        housingStore.push(...housingData);
        return housingData;
    };
    const housingData = await getHousingData();
    if (waitUntil) await sleep(waitUntil.getTime() - Date.now() + 2000); // 2 second buffer
    const guildData = await getGuildEndpointData(uuid, "GUILD", waitUntil);
    const memberUUIDs = guildData.memberUUIDs;
    const playerData = await getGuildMemberData(memberUUIDs, (arg0) =>
        simpleRetryer(() => getPlayerEndpointData(arg0))
    );
    const skyblockData = await getGuildMemberData(memberUUIDs, (arg0) =>
        simpleRetryer(() => getSkyBlockEndpointData(arg0))
    );

    return {
        memberUUIDs,
        guildData,
        playerData,
        skyblockData,
        housingData,
    };
}

/**
 * Called right after 12:00AM PST/PDT
 *
 */
export async function updateGuild(
    guildIdInternal: string,
    data: Awaited<ReturnType<typeof getGuildData>>,
    dateObj = DateTime.now().setZone("America/New_York"),
    blobHash?: string
) {
    const dateNow = dateObj.startOf("day");
    // dateSunday just works
    const dateSunday = dateObj.startOf("week").minus({ days: 1 }).toJSDate();
    const date = dateObj.toJSDate();
    const dateToday = dateNow.toJSDate();
    const dateYesterday = dateNow.minus({ days: 1 }).toJSDate();

    const memberMap = new Map(data.guildData.members.map((x) => [x.uuid, x]));
    const housingMap = new Map(data.housingData.map((x) => [x.uuid, x]));
    const playerMap = new Map(data.playerData.map((x) => [x.uuid, x]));
    const skyblockMap = new Map(data.skyblockData.map((x) => [x.uuid, x]));
    const playerIdInternalMap = new Map<string, string>();
    const prevGuildExpMap = new Map<string, number>();
    const prevHousingMap = new Map<string, number>();

    const playerDataInternal = await db.transaction(async (tx) => {
        for (const uuid of data.memberUUIDs) {
            await tx
                .insert(player)
                .values({
                    uuid: uuid,
                    username: playerMap.get(uuid).username,
                    prefix: playerMap.get(uuid).prefix,
                    color: playerMap.get(uuid).color,
                    initialJoined: new Date(
                        memberMap.get(uuid).joined
                    ).getTime(),
                    joined: new Date(memberMap.get(uuid).joined).getTime(),
                })
                .onConflictDoUpdate({
                    target: player.uuid,
                    set: {
                        username: playerMap.get(uuid).username,
                        prefix: playerMap.get(uuid).prefix,
                        color: playerMap.get(uuid).color,
                        joined: new Date(memberMap.get(uuid).joined).getTime(),
                    },
                });
        }
        const res = await tx.query.player.findMany({
            where: (player, { or, eq }) =>
                or(...data.memberUUIDs.map((x) => eq(player.uuid, x))),
            columns: {
                id: true,
                uuid: true,
            },
            with: {
                playerStats: {
                    where: (playerStats, { lte }) =>
                        lte(playerStats.createdAt, dateYesterday.getTime()),
                    orderBy: (playerStats, { desc }) =>
                        desc(playerStats.createdAt),
                    columns: {
                        experience: true,
                    },
                    limit: 1,
                },
            },
        });
        return res;
    });
    const cookieDataInternal = await db.query.player.findMany({
        where: (player, { or, eq }) =>
            or(...data.memberUUIDs.map((x) => eq(player.uuid, x))),
        columns: {
            id: true,
            uuid: true,
        },
        with: {
            playerStats: {
                where: (playerStats, { lte }) =>
                    lte(playerStats.createdAt, dateSunday.getTime()),
                orderBy: (playerStats, { desc }) => desc(playerStats.createdAt),
                columns: {
                    housingCookies: true,
                },
                limit: 1,
            },
        },
    });
    const cookieDataInternalMap = new Map(
        cookieDataInternal.map((x) => [
            x.uuid,
            x.playerStats?.[0]?.housingCookies ?? 0,
        ])
    );
    for (const { id, uuid, playerStats } of playerDataInternal) {
        playerIdInternalMap.set(uuid, id);
        prevGuildExpMap.set(uuid, playerStats?.[0]?.experience ?? 0);
        prevHousingMap.set(uuid, cookieDataInternalMap.get(uuid) ?? 0);
    }
    await db
        .update(guild)
        .set({
            name: data.guildData.name,
        })
        .where(eq(guild.id, guildIdInternal));
    console.time("Compress");
    let rawHash: string;
    if (!blobHash) {
        const rawData = JSON.stringify({
            timestamp: date,
            createdAt: dateToday,
            guildData: data.guildData.json,
            playerData: data.playerData.map((x) => x.json),
            skyblockData: data.skyblockData.map((x) => x.json),
            housingData: data.housingData.map((x) => x.json),
        });
        const hash = crypto.createHash("sha256").update(rawData).digest("hex");
        rawHash = hash;
        const timestamp = date.getTime();
        await fs.writeFile(`./blob/${timestamp}_${hash}`, await gzip(rawData));
    } else {
        rawHash = blobHash;
    }
    console.timeEnd("Compress");
    const playerData = data.memberUUIDs.map((x) => ({
        id: playerIdInternalMap.get(x),
        uuid: x,
        experience: memberMap.get(x).expHistory[1][1] + prevGuildExpMap.get(x),
        questParticipation: memberMap.get(x).questParticipation,
        skyblockExperience: skyblockMap.get(x).experience,
        housingCookies:
            (housingMap.get(x)?.cookies ?? 0) + prevHousingMap.get(x),
        playerStats: {
            ...playerMap.get(x).playerStats,
        } as PlayerStatsType,
    }));
    await db.transaction(async (tx) => {
        const res = await tx
            .insert(guildStats)
            .values({
                guildId: guildIdInternal,
                createdAt: dateToday.getTime(),
                experience: data.guildData.exp,
                experienceByGameType: JSON.stringify(
                    data.guildData.guildExpByGameType
                ),
                rawDataHash: rawHash,
            })
            .returning({
                id: guildStats.id,
            });
        await tx.insert(playerStats).values(
            playerData.map((x) => ({
                playerId: x.id,
                createdAt: dateToday.getTime(),
                playerStats: JSON.stringify(x.playerStats),
                skyblockExperience: x.skyblockExperience,
                housingCookies: x.housingCookies,
                experience: x.experience,
                questParticipation: x.questParticipation,
                guildStatsId: res[0].id,
            }))
        );
    });
}
