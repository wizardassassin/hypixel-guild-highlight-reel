import { Prisma } from "@prisma/client";
import prisma from "./db.js";
import { PlayerEndpointType, PlayerStatsType } from "./hypixel-fetcher.js";

export async function queryGuildDataLoose(
    guildId: string,
    startDate: Date,
    stopDate: Date
) {
    const [guildStart, guildStop, playersStart, playersStop] =
        await prisma.$transaction([
            prisma.guild.findUnique({
                where: {
                    guildIdDiscord: guildId,
                },
                include: {
                    GuildStats: {
                        where: {
                            createdAt: {
                                gte: startDate,
                            },
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                        take: 1,
                    },
                },
            }),
            prisma.guild.findUnique({
                where: {
                    guildIdDiscord: guildId,
                },
                select: {
                    GuildStats: {
                        where: {
                            createdAt: {
                                lte: stopDate,
                            },
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                        take: 1,
                    },
                },
            }),
            prisma.player.findMany({
                include: {
                    PlayerStats: {
                        where: {
                            createdAt: {
                                gte: startDate,
                            },
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                        take: 1,
                    },
                },
            }),
            prisma.player.findMany({
                select: {
                    id: true,
                    PlayerStats: {
                        where: {
                            createdAt: {
                                lte: stopDate,
                            },
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                        take: 1,
                    },
                },
            }),
        ]);
    if (guildStop?.GuildStats?.length >= 1) {
        guildStart.GuildStats.push(guildStop.GuildStats[0]);
    }
    for (const playerStart of playersStart) {
        const playerStop = playersStop.find((x) => x.id === playerStart.id);
        if (playerStop?.PlayerStats?.length >= 1) {
            playerStart.PlayerStats.push(playerStop.PlayerStats[0]);
        }
    }
    return {
        guild: guildStart,
        players: playersStart,
    };
}

export async function queryGuildData(
    guildId: string,
    startDate: Date,
    stopDate: Date
) {
    const data1 = await prisma.guild.findUnique({
        where: {
            guildIdDiscord: guildId,
        },
        include: {
            GuildStats: {
                where: {
                    OR: [
                        {
                            createdAt: startDate,
                        },
                        {
                            createdAt: stopDate,
                        },
                    ],
                },
                orderBy: {
                    createdAt: "asc",
                },
                include: {
                    members: {
                        include: {
                            player: true,
                        },
                    },
                },
            },
        },
    });
    return data1;
}

export async function queryGuildDataOnly(
    guildId: string,
    startDate: Date,
    stopDate: Date
) {
    const data1 = await prisma.guild.findUnique({
        where: {
            guildIdDiscord: guildId,
        },
        include: {
            GuildStats: {
                where: {
                    OR: [
                        {
                            createdAt: startDate,
                        },
                        {
                            createdAt: stopDate,
                        },
                    ],
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });
    return data1;
}

export async function queryPlayerDataLoose(
    uuid: string,
    startDate: Date,
    stopDate: Date
) {
    const [playerStart, playerStop] = await prisma.$transaction([
        prisma.player.findUnique({
            where: {
                uuid: uuid,
            },
            include: {
                PlayerStats: {
                    where: {
                        createdAt: {
                            gte: startDate,
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                    take: 1,
                },
            },
        }),
        prisma.player.findUnique({
            where: {
                uuid: uuid,
            },
            select: {
                id: true,
                PlayerStats: {
                    where: {
                        createdAt: {
                            lte: stopDate,
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                },
            },
        }),
    ]);
    if (playerStop?.PlayerStats?.length >= 1) {
        playerStart.PlayerStats.push(playerStop.PlayerStats[0]);
    }
    return playerStart;
}

export async function queryPlayerData(
    uuid: string,
    startDate: Date,
    stopDate: Date
) {
    const data1 = await prisma.player.findUnique({
        where: {
            uuid: uuid,
        },
        include: {
            PlayerStats: {
                where: {
                    OR: [
                        {
                            createdAt: startDate,
                        },
                        {
                            createdAt: stopDate,
                        },
                    ],
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });
    return data1;
}

type playerStat = Prisma.Result<
    typeof prisma.playerStats,
    Prisma.Args<typeof prisma.playerStats, "findUnique">,
    "findUnique"
>;

type parsedPlayerStat = ReturnType<typeof parsePlayerStat>;

const decoder = new TextDecoder();

export const parsePlayerStat = (stat: playerStat) => ({
    createdAt: stat.createdAt,
    stats: {
        ...(JSON.parse(decoder.decode(stat.playerStats)) as PlayerStatsType),
        experience: stat.experience,
        questParticipation: stat.questParticipation,
        skyblockExperience: stat.skyblockExperience,
        housingCookies: stat.housingCookies,
    },
});

export function diffPlayerStats(startStat: playerStat, stopStat: playerStat) {
    const firstStat = parsePlayerStat(startStat);
    const lastStat = parsePlayerStat(stopStat);
    return statKeyMap
        .map((x) => ({
            name: x.name,
            value: x.getStat(lastStat) - x.getStat(firstStat),
        }))
        .filter((x) => x.value !== 0);
}

type guildStat = Prisma.Result<
    typeof prisma.guildStats,
    Prisma.Args<typeof prisma.guildStats, "findUnique">,
    "findUnique"
>;

export function diffGuildStats(startStat: guildStat, stopStat: guildStat) {
    return {
        experience: stopStat.experience - startStat.experience,
    };
}

const statKeyMap: {
    name: string;
    getStat: (stat: parsedPlayerStat) => number;
}[] = [
    {
        name: "Achievement Points",
        getStat: (stat) => stat.stats.achievementPoints,
    },
    {
        name: "Hypixel Network Experience",
        getStat: (stat) => stat.stats.hypixelExperience,
    },
    {
        name: "Karma",
        getStat: (stat) => stat.stats.karma,
    },
    {
        name: "Quests Completed",
        getStat: (stat) => stat.stats.questsCompleted,
    },
    {
        name: "Arcade Games Wins",
        getStat: (stat) => stat.stats.arcade.wins,
    },
    {
        name: "Arena Brawl Wins",
        getStat: (stat) => stat.stats.arenaBrawl.wins,
    },
    {
        name: "Arena Brawl Kills",
        getStat: (stat) => stat.stats.arenaBrawl.kills,
    },
    {
        name: "Bed Wars Experience",
        getStat: (stat) => stat.stats.bedWars.experience,
    },
    {
        name: "Bed Wars Wins",
        getStat: (stat) => stat.stats.bedWars.wins,
    },
    {
        name: "Bed Wars Kills",
        getStat: (stat) => stat.stats.bedWars.kills,
    },
    {
        name: "Blitz Survival Games Wins",
        getStat: (stat) => stat.stats.blitzSG.wins,
    },
    {
        name: "Blitz Survival Games Kills",
        getStat: (stat) => stat.stats.blitzSG.kills,
    },
    {
        name: "Build Battle Score",
        getStat: (stat) => stat.stats.buildBattle.score,
    },
    {
        name: "Build Battle Wins",
        getStat: (stat) => stat.stats.buildBattle.wins,
    },
    {
        name: "Cops and Crims Wins",
        getStat: (stat) => stat.stats.copsAndCrims.wins,
    },
    {
        name: "Cops and Crims Kills",
        getStat: (stat) => stat.stats.copsAndCrims.kills,
    },
    {
        name: "Duels Wins",
        getStat: (stat) => stat.stats.duels.wins,
    },
    {
        name: "Duels Kills",
        getStat: (stat) => stat.stats.duels.kills,
    },
    {
        name: "Mega Walls Wins",
        getStat: (stat) => stat.stats.megaWalls.wins,
    },
    {
        name: "Mega Walls Kills",
        getStat: (stat) => stat.stats.megaWalls.kills,
    },
    {
        name: "Murder Mystery Wins",
        getStat: (stat) => stat.stats.murderMystery.wins,
    },
    {
        name: "Murder Mystery Kills",
        getStat: (stat) => stat.stats.murderMystery.kills,
    },
    {
        name: "Paintball Warfare Wins",
        getStat: (stat) => stat.stats.paintball.wins,
    },
    {
        name: "Paintball Warfare Kills",
        getStat: (stat) => stat.stats.paintball.kills,
    },
    {
        name: "The Hypixel Pit Experience",
        getStat: (stat) => stat.stats.pit.experience,
    },
    {
        name: "The Hypixel Pit Kills",
        getStat: (stat) => stat.stats.pit.kills,
    },
    {
        name: "Quakecraft Wins",
        getStat: (stat) => stat.stats.quakecraft.wins,
    },
    {
        name: "Quakecraft Kills",
        getStat: (stat) => stat.stats.quakecraft.kills,
    },
    {
        name: "SkyWars Experience",
        getStat: (stat) => stat.stats.skyWars.experience,
    },
    {
        name: "SkyWars Wins",
        getStat: (stat) => stat.stats.skyWars.wins,
    },
    {
        name: "SkyWars Kills",
        getStat: (stat) => stat.stats.skyWars.kills,
    },
    {
        name: "Smash Heroes Experience",
        getStat: (stat) => stat.stats.smashHeroes.experience,
    },
    {
        name: "Smash Heroes Wins",
        getStat: (stat) => stat.stats.smashHeroes.wins,
    },
    {
        name: "Smash Heroes Kills",
        getStat: (stat) => stat.stats.smashHeroes.kills,
    },
    {
        name: "Speed UHC Score",
        getStat: (stat) => stat.stats.speedUHC.score,
    },
    {
        name: "Speed UHC Wins",
        getStat: (stat) => stat.stats.speedUHC.wins,
    },
    {
        name: "Speed UHC Kills",
        getStat: (stat) => stat.stats.speedUHC.kills,
    },
    {
        name: "Turbo Kart Racers Trophies",
        getStat: (stat) => stat.stats.turboKartRacers.trophies,
    },
    {
        name: "Turbo Kart Racers Wins",
        getStat: (stat) => stat.stats.turboKartRacers.wins,
    },
    {
        name: "The TNT Games Wins",
        getStat: (stat) => stat.stats.tntGames.wins,
    },
    {
        name: "The TNT Games Kills",
        getStat: (stat) => stat.stats.tntGames.kills,
    },
    {
        name: "UHC Champions Score",
        getStat: (stat) => stat.stats.uhc.score,
    },
    {
        name: "UHC Champions Wins",
        getStat: (stat) => stat.stats.uhc.wins,
    },
    {
        name: "UHC Champions Kills",
        getStat: (stat) => stat.stats.uhc.kills,
    },
    {
        name: "VampireZ Wins",
        getStat: (stat) => stat.stats.vampireZ.wins,
    },
    {
        name: "VampireZ Kills",
        getStat: (stat) => stat.stats.vampireZ.kills,
    },
    {
        name: "The Walls Wins",
        getStat: (stat) => stat.stats.theWalls.wins,
    },
    {
        name: "The Walls Kills",
        getStat: (stat) => stat.stats.theWalls.kills,
    },
    {
        name: "Warlords Wins",
        getStat: (stat) => stat.stats.warlords.wins,
    },
    {
        name: "Warlords Kills",
        getStat: (stat) => stat.stats.warlords.kills,
    },
    {
        name: "Wool Games Experience",
        getStat: (stat) => stat.stats.woolGames.experience,
    },
    {
        name: "Wool Games Wins",
        getStat: (stat) => stat.stats.woolGames.wins,
    },
    {
        name: "Wool Games Kills",
        getStat: (stat) => stat.stats.woolGames.kills,
    },
    {
        name: "SkyClash Wins",
        getStat: (stat) => stat.stats.skyClash.wins,
    },
    {
        name: "SkyClash Kills",
        getStat: (stat) => stat.stats.skyClash.kills,
    },
    {
        name: "Crazy Walls Wins",
        getStat: (stat) => stat.stats.crazyWalls.wins,
    },
    {
        name: "Crazy Walls Kills",
        getStat: (stat) => stat.stats.crazyWalls.kills,
    },
    {
        name: "Guild Experience",
        getStat: (stat) => stat.stats.experience,
    },
    {
        name: "Guild Quest Participation",
        getStat: (stat) => stat.stats.questParticipation,
    },
    {
        name: "SkyBlock Experience",
        getStat: (stat) => stat.stats.skyblockExperience,
    },
    {
        name: "Housing Cookies",
        getStat: (stat) => stat.stats.housingCookies,
    },
];
