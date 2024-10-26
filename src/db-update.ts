import prisma from "./db.js";
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
} from "./hypixel-fetcher.js";
import { DateTime } from "luxon";
import { promisify } from "util";

export async function createGuild(
    discordGuildID: string,
    discordChannelID: string,
    playerUUID: string
) {
    const guildData = await getGuildEndpointData(playerUUID, "PLAYER");
    const guild = await prisma.guild.create({
        data: {
            guildIdDiscord: discordGuildID,
            channelIdDiscord: discordChannelID,
            guildIdHypixel: guildData.id,
            name: guildData.name,
            createdAtHypixel: guildData.created,
        },
    });
    return { id: guild.id, name: guildData.name };
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

export async function getHousingData(uuid: string) {
    const guildData = await getGuildEndpointData(uuid, "GUILD");
    const memberUUIDs = guildData.members.map((x) => x.uuid);
    const housingData = await getGuildMemberData(
        memberUUIDs,
        getHousingEndpointData
    );
    return {
        memberUUIDs,
        housingData,
    };
}

/**
 * Called right before Sunday 9:30AM PST/PDT
 *
 */
export async function updateHousingData(
    uuid: string,
    dateObj = DateTime.now().setZone("America/New_York"),
    manualData?: Awaited<ReturnType<typeof getHousingData>>
) {
    const date = dateObj.toJSDate();
    const dateToday = dateObj.startOf("hour").plus({ minutes: 30 }).toJSDate();

    const data = manualData ?? (await getHousingData(uuid));

    const housingCache = await prisma.housingCache.findMany({
        include: {
            player: {
                select: {
                    uuid: true,
                },
            },
        },
    });
    const housingCacheMap = new Map(
        housingCache.map((x) => [
            x.player.uuid,
            { id: x.playerId, cookies: x.cookies },
        ])
    );
    const rawData = JSON.stringify({
        timestamp: date,
        createdAt: dateToday,
        housingData: data.housingData.map((x) => x.json),
    });
    const hash = crypto.createHash("sha256").update(rawData).digest("hex");
    const timestamp = date.getTime();
    await fs.writeFile(`./blob/${timestamp}_${hash}`, await gzip(rawData));
    await prisma.$transaction(
        data.housingData
            .filter((x) => housingCacheMap.get(x.uuid))
            .map((x) =>
                prisma.housingCache.update({
                    where: {
                        playerId: housingCacheMap.get(x.uuid).id,
                    },
                    data: {
                        createdAt: dateToday,
                        cookies:
                            housingCacheMap.get(x.uuid).cookies + x.cookies,
                    },
                })
            )
    );
}

export async function getGuildData(uuid: string) {
    const guildData = await getGuildEndpointData(uuid, "GUILD");
    const memberUUIDs = guildData.members.map((x) => x.uuid);
    const playerData = await getGuildMemberData(
        memberUUIDs,
        getPlayerEndpointData
    );
    const skyblockData = await getGuildMemberData(
        memberUUIDs,
        getSkyBlockEndpointData
    );
    const housingData = await getGuildMemberData(
        memberUUIDs,
        getHousingEndpointData
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
    uuid: string,
    guildIdInternal: string,
    dateObj = DateTime.now().setZone("America/New_York"),
    manualData?: Awaited<ReturnType<typeof getGuildData>>
) {
    const dateNow = dateObj.startOf("day");
    const dateMonday = dateObj.startOf("week");
    const date = dateObj.toJSDate();
    const dateToday = dateNow.toJSDate();
    const dateYesterday = dateNow.minus({ days: 1 }).toJSDate();

    const data = manualData ?? (await getGuildData(uuid));

    const memberMap = new Map(data.guildData.members.map((x) => [x.uuid, x]));
    const housingMap = new Map(data.housingData.map((x) => [x.uuid, x]));
    const playerMap = new Map(data.playerData.map((x) => [x.uuid, x]));
    const skyblockMap = new Map(data.skyblockData.map((x) => [x.uuid, x]));
    const playerIdInternalMap = new Map<string, string>();
    const prevGuildExpMap = new Map<string, number>();
    const prevHousingMap = new Map<string, number>();

    const playerDataInternal = await prisma.$transaction(
        data.memberUUIDs.map((uuid) =>
            prisma.player.upsert({
                where: {
                    uuid: uuid,
                },
                create: {
                    uuid: uuid,
                    username: playerMap.get(uuid).username,
                    prefix: playerMap.get(uuid).prefix,
                    initialJoined: new Date(memberMap.get(uuid).joined),
                    joined: new Date(memberMap.get(uuid).joined),
                    HousingCache: {
                        create: {
                            createdAt: dateToday,
                            cookies: 0,
                        },
                    },
                },
                update: {
                    username: playerMap.get(uuid).username,
                    prefix: playerMap.get(uuid).prefix,
                    joined: new Date(memberMap.get(uuid).joined),
                },
                include: {
                    PlayerStats: {
                        where: {
                            createdAt: {
                                lte: dateYesterday,
                            },
                            GuildStats: {
                                guildId: guildIdInternal,
                            },
                        },
                        select: {
                            experience: true,
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                        take: 1,
                    },
                    HousingCache: {
                        select: {
                            cookies: true,
                        },
                    },
                },
            })
        )
    );
    for (const { id, uuid, PlayerStats, HousingCache } of playerDataInternal) {
        playerIdInternalMap.set(uuid, id);
        prevGuildExpMap.set(uuid, PlayerStats?.[0]?.experience ?? 0);
        prevHousingMap.set(uuid, HousingCache?.cookies ?? 0);
    }
    await prisma.guild.update({
        where: {
            id: guildIdInternal,
        },
        data: {
            name: data.guildData.name,
        },
    });
    const rawData = JSON.stringify({
        timestamp: date,
        createdAt: dateToday,
        guildData: data.guildData.json,
        playerData: data.playerData.map((x) => x.json),
        skyblockData: data.skyblockData.map((x) => x.json),
        housingData: data.housingData.map((x) => x.json),
    });
    const hash = crypto.createHash("sha256").update(rawData).digest("hex");
    const timestamp = date.getTime();
    await fs.writeFile(`./blob/${timestamp}_${hash}`, await gzip(rawData));
    const playerData = data.memberUUIDs.map((x) => ({
        id: playerIdInternalMap.get(x),
        uuid: x,
        experience: memberMap.get(x).expHistory[1][1] + prevGuildExpMap.get(x),
        questParticipation: memberMap.get(x).questParticipation,
        skyblockExperience: skyblockMap.get(x).experience,
        housingCookies: housingMap.get(x).cookies + prevHousingMap.get(x),
        playerStats: {
            ...playerMap.get(x).playerStats,
        } as PlayerStatsType,
    }));
    await prisma.guildStats.create({
        data: {
            guildId: guildIdInternal,
            createdAt: dateToday,
            experience: data.guildData.exp,
            experienceByGameType: Buffer.from(
                JSON.stringify(data.guildData.guildExpByGameType)
            ),
            members: {
                createMany: {
                    data: playerData.map((x) => ({
                        playerId: x.id,
                        createdAt: dateToday,
                        playerStats: Buffer.from(JSON.stringify(x.playerStats)),
                        skyblockExperience: x.skyblockExperience,
                        housingCookies: x.housingCookies,
                        experience: x.experience,
                        questParticipation: x.questParticipation,
                    })),
                },
            },
            rawDataHash: hash,
        },
    });
}
