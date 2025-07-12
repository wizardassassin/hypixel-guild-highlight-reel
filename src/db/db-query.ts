import db from "./db.js";
import {
    PlayerEndpointType,
    PlayerStatsType,
} from "../query/hypixel-fetcher.js";

export async function queryGuildDataLoose(
    guildId: string,
    startDate: Date,
    stopDate: Date
) {
    const [guildStart, guildStop, playersStart, playersStop] =
        await db.transaction(async (tx) => {
            const guildStart = await tx.query.guild.findFirst({
                where: (guild, { eq }) => eq(guild.guildIdDiscord, guildId),
                with: {
                    guildStats: {
                        where: (guildStats, { gte }) =>
                            gte(guildStats.createdAt, startDate.getTime()),
                        orderBy: (guildStats, { asc }) =>
                            asc(guildStats.createdAt),
                        limit: 1,
                    },
                },
            });
            const guildStop = await tx.query.guild.findFirst({
                where: (guild, { eq }) => eq(guild.guildIdDiscord, guildId),
                columns: {
                    id: true,
                },
                with: {
                    guildStats: {
                        where: (guildStats, { lte }) =>
                            lte(guildStats.createdAt, stopDate.getTime()),
                        orderBy: (guildStats, { desc }) =>
                            desc(guildStats.createdAt),
                        limit: 1,
                    },
                },
            });
            const playersStart = await tx.query.player.findMany({
                where: (playerStats, { eq }) =>
                    eq(playerStats.id, playerStats.id),
                with: {
                    playerStats: {
                        where: (playerStats, { gte }) =>
                            gte(playerStats.createdAt, startDate.getTime()),
                        orderBy: (playerStats, { asc }) =>
                            asc(playerStats.createdAt),
                        limit: 1,
                    },
                },
            });
            const playersStop = await tx.query.player.findMany({
                where: (playerStats, { eq }) =>
                    eq(playerStats.id, playerStats.id),
                columns: {
                    id: true,
                },
                with: {
                    playerStats: {
                        where: (playerStats, { lte }) =>
                            lte(playerStats.createdAt, stopDate.getTime()),
                        orderBy: (playerStats, { desc }) =>
                            desc(playerStats.createdAt),
                        limit: 1,
                    },
                },
            });
            return [guildStart, guildStop, playersStart, playersStop];
        });

    if (guildStop?.guildStats?.length >= 1) {
        guildStart.guildStats.push(guildStop.guildStats[0]);
    }
    for (const playerStart of playersStart) {
        const playerStop = playersStop.find((x) => x.id === playerStart.id);
        if (playerStop?.playerStats?.length >= 1) {
            playerStart.playerStats.push(playerStop.playerStats[0]);
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
    const data1 = await db.query.guild.findFirst({
        where: (guild, { eq }) => eq(guild.guildIdDiscord, guildId),
        with: {
            guildStats: {
                where: (guildStats, { eq, or }) =>
                    or(
                        eq(guildStats.createdAt, startDate.getTime()),
                        eq(guildStats.createdAt, stopDate.getTime())
                    ),
                orderBy: (guildStats, { asc }) => asc(guildStats.createdAt),
                with: {
                    playerStats: {
                        with: {
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
    const data1 = await db.query.guild.findFirst({
        where: (guild, { eq }) => eq(guild.guildIdDiscord, guildId),
        with: {
            guildStats: {
                where: (guildStats, { eq, or }) =>
                    or(
                        eq(guildStats.createdAt, startDate.getTime()),
                        eq(guildStats.createdAt, stopDate.getTime())
                    ),
                orderBy: (guildStats, { asc }) => asc(guildStats.createdAt),
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
    const [playerStart, playerStop] = await db.transaction(async (tx) => {
        const playerStart = await tx.query.player.findFirst({
            where: (player, { eq }) => eq(player.uuid, uuid),
            with: {
                playerStats: {
                    where: (playerStats, { gte }) =>
                        gte(playerStats.createdAt, startDate.getTime()),
                    orderBy: (playerStats, { asc }) =>
                        asc(playerStats.createdAt),
                    limit: 1,
                },
            },
        });
        const playerStop = await tx.query.player.findFirst({
            where: (player, { eq }) => eq(player.uuid, uuid),
            columns: {
                id: true,
            },
            with: {
                playerStats: {
                    where: (playerStats, { lte }) =>
                        lte(playerStats.createdAt, stopDate.getTime()),
                    orderBy: (playerStats, { desc }) =>
                        desc(playerStats.createdAt),
                    limit: 1,
                },
            },
        });
        return [playerStart, playerStop];
    });
    if (playerStop?.playerStats?.length >= 1) {
        playerStart.playerStats.push(playerStop.playerStats[0]);
    }
    return playerStart;
}

export async function queryPlayerData(
    uuid: string,
    startDate: Date,
    stopDate: Date
) {
    const data1 = await db.query.player.findFirst({
        where: (player, { eq }) => eq(player.uuid, uuid),
        with: {
            playerStats: {
                where: (playerStats, { eq, or }) =>
                    or(
                        eq(playerStats.createdAt, startDate.getTime()),
                        eq(playerStats.createdAt, stopDate.getTime())
                    ),
                orderBy: (playerStats, { asc }) => asc(playerStats.createdAt),
            },
        },
    });
    return data1;
}

type playerStat = Awaited<
    ReturnType<typeof queryPlayerData>
>["playerStats"][number];

type parsedPlayerStat = ReturnType<typeof parsePlayerStat>;

const decoder = new TextDecoder();

export const parsePlayerStat = (stat: playerStat) => ({
    createdAt: new Date(stat.createdAt),
    stats: {
        ...(JSON.parse(stat.playerStats) as PlayerStatsType),
        experience: stat.experience,
        questParticipation: stat.questParticipation,
        skyblockExperience: stat.skyblockExperience,
        housingCookies: stat.housingCookies,
    },
});

export function diffPlayerStats(startStat: playerStat, stopStat: playerStat) {
    const firstStat = parsePlayerStat(startStat);
    const lastStat = parsePlayerStat(stopStat);
    const stats: {
        name: string;
        thumbnail: string;
        stats: { name: string; value: number }[];
    }[] = [
        {
            name: "General",
            thumbnail: "./files/Arcade_Games.png",
            stats: [
                {
                    name: "Achievement Points",
                    value:
                        lastStat.stats.achievementPoints -
                        firstStat.stats.achievementPoints,
                },
                {
                    name: "Hypixel Network Experience",
                    value:
                        lastStat.stats.hypixelExperience -
                        firstStat.stats.hypixelExperience,
                },
                {
                    name: "Karma",
                    value: lastStat.stats.karma - firstStat.stats.karma,
                },
                {
                    name: "Quests Completed",
                    value:
                        lastStat.stats.questsCompleted -
                        firstStat.stats.questsCompleted,
                },
                {
                    name: "Guild Experience",
                    value:
                        lastStat.stats.experience - firstStat.stats.experience,
                },
                {
                    name: "Guild Quest Participation",
                    value:
                        lastStat.stats.questParticipation -
                        firstStat.stats.questParticipation,
                },
            ],
        },
        {
            name: "Arcade Games",
            thumbnail: "./files/Arcade_Games.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.arcade.wins -
                        firstStat.stats.arcade.wins,
                },
            ],
        },
        {
            name: "Arena Brawl",
            thumbnail: "./files/Arena_Brawl.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.arenaBrawl.wins -
                        firstStat.stats.arenaBrawl.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.arenaBrawl.kills -
                        firstStat.stats.arenaBrawl.kills,
                },
            ],
        },
        {
            name: "Bed Wars",
            thumbnail: "./files/Bed_Wars.png",
            stats: [
                {
                    name: "Experience",
                    value:
                        lastStat.stats.bedWars.experience -
                        firstStat.stats.bedWars.experience,
                },
                {
                    name: "Wins",
                    value:
                        lastStat.stats.bedWars.wins -
                        firstStat.stats.bedWars.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.bedWars.kills -
                        firstStat.stats.bedWars.kills,
                },
            ],
        },
        {
            name: "Blitz Survival Games",
            thumbnail: "./files/Blitz_Survival_Games.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.blitzSG.wins -
                        firstStat.stats.blitzSG.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.blitzSG.kills -
                        firstStat.stats.blitzSG.kills,
                },
            ],
        },
        {
            name: "Build Battle",
            thumbnail: "./files/Build_Battle.png",
            stats: [
                {
                    name: "Score",
                    value:
                        lastStat.stats.buildBattle.score -
                        firstStat.stats.buildBattle.score,
                },
                {
                    name: "Wins",
                    value:
                        lastStat.stats.buildBattle.wins -
                        firstStat.stats.buildBattle.wins,
                },
            ],
        },
        {
            name: "Cops and Crims",
            thumbnail: "./files/Cops_and_Crims.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.copsAndCrims.wins -
                        firstStat.stats.copsAndCrims.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.copsAndCrims.kills -
                        firstStat.stats.copsAndCrims.kills,
                },
            ],
        },
        {
            name: "Duels",
            thumbnail: "./files/Duels.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.duels.wins - firstStat.stats.duels.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.duels.kills -
                        firstStat.stats.duels.kills,
                },
            ],
        },
        {
            name: "Housing",
            thumbnail: "./files/Housing.png",
            stats: [
                {
                    name: "Cookies",
                    value:
                        lastStat.stats.housingCookies -
                        firstStat.stats.housingCookies,
                },
            ],
        },
        {
            name: "Mega Walls",
            thumbnail: "./files/Mega_Walls.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.megaWalls.wins -
                        firstStat.stats.megaWalls.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.megaWalls.kills -
                        firstStat.stats.megaWalls.kills,
                },
            ],
        },
        {
            name: "Murder Mystery",
            thumbnail: "./files/Murder_Mystery.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.murderMystery.wins -
                        firstStat.stats.murderMystery.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.murderMystery.kills -
                        firstStat.stats.murderMystery.kills,
                },
            ],
        },
        {
            name: "Paintball Warfare",
            thumbnail: "./files/Paintball_Warfare.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.paintball.wins -
                        firstStat.stats.paintball.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.paintball.kills -
                        firstStat.stats.paintball.kills,
                },
            ],
        },
        {
            name: "The Hypixel Pit",
            thumbnail: "./files/The_Hypixel_Pit.png",
            stats: [
                {
                    name: "Experience",
                    value:
                        lastStat.stats.pit.experience -
                        firstStat.stats.pit.experience,
                },
                {
                    name: "Kills",
                    value: lastStat.stats.pit.kills - firstStat.stats.pit.kills,
                },
            ],
        },
        {
            name: "Quakecraft",
            thumbnail: "./files/Quakecraft.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.quakecraft.wins -
                        firstStat.stats.quakecraft.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.quakecraft.kills -
                        firstStat.stats.quakecraft.kills,
                },
            ],
        },
        {
            name: "SkyBlock",
            thumbnail: "./files/SkyBlock.png",
            stats: [
                {
                    name: "Experience",
                    value:
                        lastStat.stats.skyblockExperience -
                        firstStat.stats.skyblockExperience,
                },
            ],
        },
        {
            name: "SkyWars",
            thumbnail: "./files/SkyWars.png",
            stats: [
                {
                    name: "Experience",
                    value:
                        lastStat.stats.skyWars.experience -
                        firstStat.stats.skyWars.experience,
                },
                {
                    name: "Wins",
                    value:
                        lastStat.stats.skyWars.wins -
                        firstStat.stats.skyWars.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.skyWars.kills -
                        firstStat.stats.skyWars.kills,
                },
            ],
        },
        {
            name: "Smash Heroes",
            thumbnail: "./files/Smash_Heroes.png",
            stats: [
                {
                    name: "Experience",
                    value:
                        lastStat.stats.smashHeroes.experience -
                        firstStat.stats.smashHeroes.experience,
                },
                {
                    name: "Wins",
                    value:
                        lastStat.stats.smashHeroes.wins -
                        firstStat.stats.smashHeroes.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.smashHeroes.kills -
                        firstStat.stats.smashHeroes.kills,
                },
            ],
        },
        {
            name: "Speed UHC",
            thumbnail: "./files/Speed_UHC.png",
            stats: [
                {
                    name: "Score",
                    value:
                        lastStat.stats.speedUHC.score -
                        firstStat.stats.speedUHC.score,
                },
                {
                    name: "Wins",
                    value:
                        lastStat.stats.speedUHC.wins -
                        firstStat.stats.speedUHC.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.speedUHC.kills -
                        firstStat.stats.speedUHC.kills,
                },
            ],
        },
        {
            name: "Turbo Kart Racers",
            thumbnail: "./files/Turbo_Kart_Racers.png",
            stats: [
                {
                    name: "Trophies",
                    value:
                        lastStat.stats.turboKartRacers.trophies -
                        firstStat.stats.turboKartRacers.trophies,
                },
                {
                    name: "Wins",
                    value:
                        lastStat.stats.turboKartRacers.wins -
                        firstStat.stats.turboKartRacers.wins,
                },
            ],
        },
        {
            name: "The TNT Games",
            thumbnail: "./files/The_TNT_Games.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.tntGames.wins -
                        firstStat.stats.tntGames.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.tntGames.kills -
                        firstStat.stats.tntGames.kills,
                },
            ],
        },
        {
            name: "UHC Champions",
            thumbnail: "./files/UHC_Champions.png",
            stats: [
                {
                    name: "Score",
                    value: lastStat.stats.uhc.score - firstStat.stats.uhc.score,
                },
                {
                    name: "Wins",
                    value: lastStat.stats.uhc.wins - firstStat.stats.uhc.wins,
                },
                {
                    name: "Kills",
                    value: lastStat.stats.uhc.kills - firstStat.stats.uhc.kills,
                },
            ],
        },
        {
            name: "VampireZ",
            thumbnail: "./files/VampireZ.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.vampireZ.wins -
                        firstStat.stats.vampireZ.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.vampireZ.kills -
                        firstStat.stats.vampireZ.kills,
                },
            ],
        },
        {
            name: "The Walls",
            thumbnail: "./files/The_Walls.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.theWalls.wins -
                        firstStat.stats.theWalls.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.theWalls.kills -
                        firstStat.stats.theWalls.kills,
                },
            ],
        },
        {
            name: "Warlords",
            thumbnail: "./files/Warlords.png",
            stats: [
                {
                    name: "Wins",
                    value:
                        lastStat.stats.warlords.wins -
                        firstStat.stats.warlords.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.warlords.kills -
                        firstStat.stats.warlords.kills,
                },
            ],
        },
        {
            name: "Wool Games",
            thumbnail: "./files/Wool_Games.png",
            stats: [
                {
                    name: "Experience",
                    value:
                        lastStat.stats.woolGames.experience -
                        firstStat.stats.woolGames.experience,
                },
                {
                    name: "Wins",
                    value:
                        lastStat.stats.woolGames.wins -
                        firstStat.stats.woolGames.wins,
                },
                {
                    name: "Kills",
                    value:
                        lastStat.stats.woolGames.kills -
                        firstStat.stats.woolGames.kills,
                },
            ],
        },
    ];
    return stats;
}

type guildStat = Awaited<
    ReturnType<typeof queryGuildData>
>["guildStats"][number];

export function diffGuildStats(startStat: guildStat, stopStat: guildStat) {
    return {
        experience: stopStat.experience - startStat.experience,
    };
}

export const statKeyMap: {
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
