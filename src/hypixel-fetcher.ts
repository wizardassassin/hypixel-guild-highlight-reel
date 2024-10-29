import fs from "fs/promises";
import { sleep } from "./utils.js";
import { DateTime } from "luxon";
// TODO: housing, skyblock

export type PlayerStatsType = PlayerEndpointType["playerStats"];

export class HypixelFetcher {
    static #instance: HypixelFetcher;
    rateLimitLimit: number;
    rateLimitRemaining: number;
    rateLimitReset: number;
    lastFetch: Date;
    logRemaining: boolean;
    constructor() {
        this.rateLimitLimit = -1;
        this.rateLimitRemaining = -1;
        this.rateLimitReset = -1;
        this.lastFetch = new Date(0);
        this.logRemaining = true;
    }
    static get instance() {
        if (!this.#instance) return (this.#instance = new HypixelFetcher());
        return this.#instance;
    }
    #parseJson(text: string, noThrow = false) {
        try {
            const json = JSON.parse(text);
            return json;
        } catch (error) {
            console.error(text);
            if (!noThrow) throw error;
        }
    }
    async #waitReset(date: Date) {
        if (this.rateLimitRemaining !== 0) return;
        const timeRemaining =
            this.rateLimitReset * 1000 -
            (date.getTime() - this.lastFetch.getTime());
        if (timeRemaining > 0) {
            console.log(
                "Rate Limit Reached. Waiting " +
                    (timeRemaining / 1000).toFixed(1) +
                    " seconds."
            );
            await sleep(timeRemaining + 2000); // added two buffer seconds
            this.logRemaining = true;
        }
    }
    setRateLimit(res: Response, doLog = false) {
        const limit = Number(res.headers.get("RateLimit-Limit"));
        const remaining = Number(res.headers.get("RateLimit-Remaining"));
        const reset = Number(res.headers.get("RateLimit-Reset"));
        if (
            Number.isFinite(limit) &&
            Number.isFinite(remaining) &&
            Number.isFinite(reset)
        ) {
            if (doLog && this.logRemaining) {
                console.log("Remaining Requests: " + remaining);
                this.logRemaining = false;
            }
            this.rateLimitLimit = limit;
            this.rateLimitRemaining = remaining;
            this.rateLimitReset = reset;
            this.lastFetch = new Date();
        }
    }
    /**
     * Called one at a time
     *
     */
    async fetchURL(url: string, depth = 0) {
        const date = new Date();
        await this.#waitReset(date);
        try {
            const res = await fetch(url, {
                headers: {
                    "API-Key": process.env.HYPIXEL_API_KEY,
                },
            });
            if (!res.ok) {
                console.error("Response Code: " + res.status);
                const text = await res.text();
                const json = this.#parseJson(text, true);
                if (json) console.error(json);
                if (json?.throttle && depth < 5) {
                    this.setRateLimit(res);
                    console.error("Hit Key Throttle, waiting 5 seconds.", {
                        limit: this.rateLimitLimit,
                        remaining: this.rateLimitRemaining,
                        reset: this.rateLimitReset,
                    });
                    await sleep(5000);
                    return await this.fetchURL(url, depth + 1);
                }
                throw new Error("Invalid Response Code: " + res.status);
            }
            const text = await res.text();
            const json = this.#parseJson(text);
            // if (!json.success) { // the housing api breaks the json.success convention
            //     console.error(json);
            //     throw new Error("Unsuccessful Json Response");
            // }
            this.setRateLimit(res, true);
            return json;
        } catch (error) {
            console.error({ url });
            throw error;
        }
    }
}

export type GuildEndpointType = Awaited<
    ReturnType<typeof getGuildEndpointData>
>;

export async function getGuildEndpointData(
    uuid: string,
    idType: "PLAYER" | "GUILD" = "PLAYER",
    date = DateTime.now().setZone("America/New_York").startOf("day").toJSDate(),
    depth = 0
) {
    const url =
        idType === "PLAYER"
            ? `https://api.hypixel.net/v2/guild?player=${uuid}`
            : `https://api.hypixel.net/v2/guild?id=${uuid}`;
    const json = await HypixelFetcher.instance.fetchURL(url);
    const guild = parseGuildEndpointData(json);
    const date2 = guild.members[0].expHistory[0][0];
    const date3 = DateTime.fromJSDate(date)
        .setZone("America/New_York")
        .startOf("day");
    if (date3.toMillis() !== date2.getTime()) {
        console.error(date3.toJSDate(), date2);
        if (depth < 5) {
            console.error("Date mismatch, waiting 5 seconds.");
            await sleep(5000);
            return await getGuildEndpointData(uuid, idType, date, depth + 1);
        }
        throw new Error("Date mismatch");
    }
    return guild;
}

export function parseGuildEndpointData(json: any) {
    const guild = json.guild;
    const members = (guild.members as any[]).map((x) => ({
        uuid: x.uuid as string,
        joined: x.joined as number,
        expHistory: Object.entries(x.expHistory as { [key: string]: number })
            .map(
                ([key, value]) =>
                    [
                        DateTime.fromISO(key, {
                            zone: "America/New_York",
                        }).toJSDate(),
                        value,
                    ] as [Date, number]
            )
            .sort((a, b) => b[0].getTime() - a[0].getTime()),
        questParticipation: Number(x.questParticipation ?? 0),
    }));
    const guildExpByGameType = Object.entries(
        guild.guildExpByGameType as { [key: string]: number }
    );

    return {
        id: guild._id as string,
        name: guild.name as string,
        created: new Date(guild.created),
        exp: guild.exp as number,
        guildExpByGameType,
        memberUUIDs: members.map((x) => x.uuid),
        members,
        json,
    };
}

const removeUUIDDashes = (uuid: string) => uuid.replace(/-/g, "");

export async function getSkyBlockEndpointData(uuid: string) {
    const json = await HypixelFetcher.instance.fetchURL(
        `https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}`
    );
    return parseSkyBlockEndpointData(json, uuid);
}

export function parseSkyBlockEndpointData(json: any, uuid: string) {
    const profiles = json.profiles;
    const uuid2 = removeUUIDDashes(uuid);
    const profiles2 = ((profiles ?? []) as any[]).map((x) => ({
        id: x.profile_id as string,
        experience: Number(x?.members?.[uuid2]?.leveling?.experience ?? 0),
    }));
    return {
        uuid,
        experience: Math.max(...profiles2.map((x) => x.experience), 0),
        json,
    };
}

export async function getHousingEndpointData(uuid: string) {
    const json = await HypixelFetcher.instance.fetchURL(
        `https://api.hypixel.net/v2/housing/houses?player=${uuid}`
    );
    return parseHousingEndpointData(json, uuid);
}

export function parseHousingEndpointData(json: any, uuid: string) {
    const houses = json;
    const houses2 = ((houses ?? []) as any[]).map((x) => ({
        id: x.uuid as string,
        name: x.name as string,
        createdAt: x.createdAt as number,
        cookies: x.cookies.current as number,
    }));
    return {
        uuid,
        cookies: houses2.map((x) => x.cookies).reduce((a, b) => a + b, 0),
        json,
    };
}

export type PlayerEndpointType = Awaited<
    ReturnType<typeof getPlayerEndpointData>
>;

export async function getPlayerEndpointData(uuid: string) {
    const json = await HypixelFetcher.instance.fetchURL(
        `https://api.hypixel.net/v2/player?uuid=${uuid}`
    );
    return parsePlayerEndpointData(json);
}

export function parsePlayerEndpointData(json: any) {
    const player = json.player;
    const stats = player.stats;
    const playerStats = {
        achievementPoints: Number(player.achievementPoints ?? 0),
        hypixelExperience: Number(player.networkExp ?? 0),
        hypixelLevel: getNetworkLevel(Number(player.networkExp ?? 0)),
        karma: Number(player.karma ?? 0),
        questsCompleted: Object.values(player.quests ?? {})
            .map((x: any) => Number(x.completions?.length ?? 0))
            .reduce((a, b) => a + b, 0),
        arcade: {
            wins: getArcadeWins(stats?.Arcade),
            tournament: {
                wins:
                    Number(
                        stats?.Arcade?.wins_grinch_simulator_v2_tourney ?? 0
                    ) +
                    Number(
                        stats?.Arcade
                            ?.wins_grinch_simulator_v2_tourney_grinch_simulator_1 ??
                            0
                    ) +
                    Number(
                        stats?.Arcade
                            ?.wins_grinch_simulator_v2_tourney_grinch_simulator_1 ??
                            0
                    ) +
                    Number(stats?.Arcade?.wins_tourney_mini_walls_0 ?? 0) +
                    Number(stats?.Arcade?.wins_ss_SANTA_SIMULATOR ?? 0) +
                    Number(stats?.Arcade?.wins_santa_simulator ?? 0), // wins_ss_SANTA_SIMULATOR wins_santa_simulator ??
            },
        },
        arenaBrawl: {
            wins: Number(stats?.Arena?.wins ?? 0),
            kills:
                Number(stats?.Arena?.kills_1v1 ?? 0) +
                Number(stats?.Arena?.kills_2v2 ?? 0) +
                Number(stats?.Arena?.kills_4v4 ?? 0),
        },
        bedWars: {
            experience: Number(stats?.Bedwars?.Experience ?? 0),
            level: getBedWarsLevel(Number(stats?.Bedwars?.Experience ?? 0)),
            wins: Number(stats?.Bedwars?.wins_bedwars ?? 0),
            kills:
                Number(stats?.Bedwars?.kills_bedwars ?? 0) +
                Number(stats?.Bedwars?.final_kills_bedwars ?? 0),
            tournament: {
                wins:
                    Number(
                        stats?.Bedwars?.tourney_bedwars4s_0_wins_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_two_four_0_wins_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars?.tourney_bedwars4s_1_wins_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_eight_two_0_wins_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_eight_two_1_wins_bedwars ?? 0
                    ),
                kills:
                    Number(
                        stats?.Bedwars?.tourney_bedwars4s_0_kills_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars4s_0_final_kills_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_two_four_0_kills_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_two_four_0_final_kills_bedwars ??
                            0
                    ) +
                    Number(
                        stats?.Bedwars?.tourney_bedwars4s_1_kills_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars4s_1_final_kills_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_eight_two_0_kills_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_eight_two_0_final_kills_bedwars ??
                            0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_eight_two_1_kills_bedwars ?? 0
                    ) +
                    Number(
                        stats?.Bedwars
                            ?.tourney_bedwars_eight_two_1_final_kills_bedwars ??
                            0
                    ),
            },
        },
        blitzSG: {
            wins:
                Number(stats?.HungerGames?.wins_solo_normal ?? 0) +
                Number(stats?.HungerGames?.wins_teams ?? 0),
            kills: Number(stats?.HungerGames?.kills ?? 0),
            tournament: {
                wins:
                    // Number(stats?.HungerGames?.wins_solo_chaos ?? 0) +
                    Number(
                        stats?.HungerGames?.tourney_blitz_duo_0_wins_teams ?? 0
                    ) +
                    Number(
                        stats?.HungerGames?.tourney_blitz_duo_1_wins_teams ?? 0
                    ) +
                    Number(
                        stats?.HungerGames?.tourney_blitz_duo_2_wins_teams ?? 0
                    ),
                kills:
                    Number(stats?.HungerGames?.tourney_blitz_duo_0_kills ?? 0) +
                    Number(
                        stats?.HungerGames?.tourney_blitz_duo_1_kills_teams ?? 0
                    ) +
                    Number(
                        stats?.HungerGames?.tourney_blitz_duo_2_kills_teams ?? 0
                    ),
            },
        },
        buildBattle: {
            score: Number(stats?.BuildBattle?.score ?? 0),
            wins: Number(stats?.BuildBattle?.wins ?? 0),
        },
        copsAndCrims: {
            wins:
                Number(stats?.MCGO?.game_wins ?? 0) +
                Number(stats?.MCGO?.game_wins_deathmatch ?? 0) +
                Number(stats?.MCGO?.game_wins_gungame ?? 0),
            kills:
                Number(stats?.MCGO?.kills ?? 0) +
                Number(stats?.MCGO?.kills_deathmatch ?? 0) +
                Number(stats?.MCGO?.kills_gungame ?? 0),
            tournament: {
                wins:
                    Number(stats?.MCGO?.game_wins_tourney_mcgo_defusal_0 ?? 0) +
                    Number(stats?.MCGO?.game_wins_tourney_mcgo_defusal_1 ?? 0),
                kills:
                    Number(stats?.MCGO?.kills_tourney_mcgo_defusal_0 ?? 0) +
                    Number(stats?.MCGO?.kills_tourney_mcgo_defusal_1 ?? 0),
            },
        },
        duels: {
            wins: Number(stats?.Duels?.wins ?? 0),
            kills: Number(stats?.Duels?.kills ?? 0),
        },
        megaWalls: {
            wins: Number(stats?.Walls3?.wins ?? 0), // tourney included
            kills: Number(stats?.Walls3?.kills ?? 0),
        },
        murderMystery: {
            wins: Number(stats?.MurderMystery?.wins ?? 0),
            kills: Number(stats?.MurderMystery?.kills ?? 0),
        },
        paintball: {
            kills: Number(stats?.Paintball?.kills),
            wins: Number(stats?.Paintball?.wins),
        },
        pit: {
            experience: Number(stats?.Pit?.profile?.xp ?? 0),
            prestige: Number(stats?.Pit?.profile?.prestiges?.length ?? 0),
            kills: Number(stats?.Pit?.pit_stats_ptl?.kills ?? 0),
        },
        quakecraft: {
            wins:
                Number(stats?.Quake?.wins ?? 0) +
                Number(stats?.Quake?.wins_teams ?? 0),
            kills:
                Number(stats?.Quake?.kills ?? 0) +
                Number(stats?.Quake?.kills_teams ?? 0),
            tournament: {
                wins:
                    Number(stats?.Quake?.wins_solo_tourney ?? 0) +
                    Number(stats?.Quake?.wins_tourney_quake_solo2_1 ?? 0),
                kills:
                    Number(stats?.Quake?.kills_solo_tourney ?? 0) +
                    Number(stats?.Quake?.kills_tourney_quake_solo2_1 ?? 0),
            },
        },
        skyWars: {
            experience: Number(stats?.SkyWars?.skywars_experience ?? 0),
            level: getSkyWarsLevel(
                Number(stats?.SkyWars?.skywars_experience ?? 0)
            ),
            wins: Number(stats?.SkyWars?.wins ?? 0),
            kills: Number(stats?.SkyWars?.kills ?? 0),
            tournament: {
                wins:
                    Number(stats?.SkyWars?.tourney_sw_crazy_solo_0_wins ?? 0) +
                    Number(
                        stats?.SkyWars?.tourney_sw_insane_doubles_0_wins ?? 0
                    ) +
                    Number(
                        stats?.SkyWars?.tourney_sw_insane_doubles_1_wins ?? 0
                    ) +
                    Number(
                        stats?.SkyWars?.tourney_sw_normal_doubles_0_wins ?? 0
                    ),
                kills:
                    Number(stats?.SkyWars?.tourney_sw_crazy_solo_0_kills ?? 0) +
                    Number(
                        stats?.SkyWars?.tourney_sw_insane_doubles_0_kills ?? 0
                    ) +
                    Number(
                        stats?.SkyWars?.tourney_sw_insane_doubles_1_kills ?? 0
                    ) +
                    Number(
                        stats?.SkyWars?.tourney_sw_normal_doubles_0_kills ?? 0
                    ),
            },
            luckyBlockWins: Number(
                stats?.SkyWars?.lab_win_lucky_blocks_lab ?? 0
            ),
        },
        // skyblock: {
        //     level: Number(player?.achievements?.skyblock_sb_levels ?? 0),
        // },
        smashHeroes: {
            experience: Object.keys(stats?.SuperSmash ?? {})
                .filter((x) => x.startsWith("xp_"))
                .map((x) => Number(stats?.SuperSmash?.[x] ?? 0))
                .reduce((a, b) => a + b, 0),
            level: Number(stats?.SuperSmash?.smashLevel ?? 0), // smash_level_total
            wins: Number(stats?.SuperSmash?.wins ?? 0),
            kills: Number(stats?.SuperSmash?.kills ?? 0),
        },
        speedUHC: {
            score: Number(stats?.SpeedUHC?.score ?? 0),
            wins: Number(stats?.SpeedUHC?.wins ?? 0),
            kills: Number(stats?.SpeedUHC?.kills ?? 0),
        },
        turboKartRacers: {
            trophies:
                Number(stats?.GingerBread?.bronze_trophy ?? 0) +
                Number(stats?.GingerBread?.silver_trophy ?? 0) +
                Number(stats?.GingerBread?.gold_trophy ?? 0),
            wins: Number(stats?.GingerBread?.gold_trophy ?? 0),
            tournament: {
                trophies:
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_0_bronze_trophy ?? 0
                    ) +
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_0_silver_trophy ?? 0
                    ) +
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_0_gold_trophy ?? 0
                    ) +
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_1_bronze_trophy ?? 0
                    ) +
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_1_silver_trophy ?? 0
                    ) +
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_1_gold_trophy ?? 0
                    ),
                wins:
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_0_gold_trophy ?? 0
                    ) +
                    Number(
                        stats?.GingerBread
                            ?.tourney_gingerbread_solo_1_gold_trophy ?? 0
                    ),
            },
        },
        tntGames: {
            wins: Number(stats?.TNTGames?.wins ?? 0),
            kills:
                Number(stats?.TNTGames?.kills_tntag ?? 0) +
                Number(stats?.TNTGames?.kills_capture ?? 0) +
                Number(stats?.TNTGames?.kills_pvprun ?? 0),
            tournament: {
                wins:
                    Number(stats?.TNTGames?.wins_tourney_tnt_run_0 ?? 0) +
                    Number(stats?.TNTGames?.wins_tourney_tnt_run_1 ?? 0),
                kills: 0,
            },
        },
        uhc: {
            score: Number(stats?.UHC?.score ?? 0),
            wins: Number(stats?.UHC?.wins ?? 0),
            kills: Number(stats?.UHC?.kills ?? 0),
        },
        vampireZ: {
            wins:
                Number(stats?.VampireZ?.human_wins ?? 0) +
                Number(stats?.VampireZ?.vampire_wins ?? 0),
            kills:
                Number(stats?.VampireZ?.vampire_kills ?? 0) +
                Number(stats?.VampireZ?.human_kills ?? 0),
        },
        theWalls: {
            wins: Number(stats?.Walls?.wins ?? 0), // tourney included
            kills: Number(stats?.Walls?.kills ?? 0),
        },
        warlords: {
            wins: Number(stats?.Battleground?.wins ?? 0),
            kills: Number(stats?.Battleground?.kills ?? 0),
        },
        woolGames: {
            experience: Number(stats?.WoolGames?.progression?.experience ?? 0),
            level: getWoolGamesLevel(
                Number(stats?.WoolGames?.progression?.experience ?? 0)
            ),
            wins:
                Number(stats?.WoolGames?.wool_wars?.stats?.wins ?? 0) +
                Number(
                    stats?.WoolGames?.capture_the_wool?.stats
                        ?.participated_wins ?? 0
                ) +
                Number(stats?.WoolGames?.sheep_wars?.stats?.wins ?? 0),
            kills:
                Number(stats?.WoolGames?.wool_wars?.stats?.kills ?? 0) +
                Number(stats?.WoolGames?.capture_the_wool?.stats?.kills ?? 0) +
                Number(stats?.WoolGames?.sheep_wars?.stats?.kills ?? 0),
            tournament: {
                wins:
                    Number(stats?.WoolGames?.tourney?.wool_wars_0?.wins ?? 0) +
                    Number(stats?.WoolGames?.tourney?.wool_wars_1?.wins ?? 0),
                kills:
                    Number(stats?.WoolGames?.tourney?.wool_wars_0?.kills ?? 0) +
                    Number(stats?.WoolGames?.tourney?.wool_wars_1?.kills ?? 0),
            },
        },
        skyClash: {
            wins: Number(stats?.SkyClash?.wins ?? 0),
            kills: Number(stats?.SkyClash?.kills ?? 0),
        },
        crazyWalls: {
            wins: Number(stats?.TrueCombat?.wins ?? 0),
            kills: Number(stats?.TrueCombat?.kills ?? 0),
        },
    };

    return {
        uuid: String(player.uuid),
        username: String(player.displayname),
        prefix: getPlayerPrefix(player),
        playerStats,
        json,
    };
}

function getPlayerPrefix(player: any) {
    if (player.prefix) return (player.prefix as string).replace(/§./g, "");
    if (player.rank === "ADMIN") return "[ADMIN]";
    if (player.rank === "GAME_MASTER") return "[GM]";
    if (player.rank === "YOUTUBER") return "[YOUTUBE]";
    if (player.monthlyPackageRank === "SUPERSTAR") return "[MVP++]";
    if (player.newPackageRank === "VIP") return "[VIP]";
    if (player.newPackageRank === "VIP_PLUS") return "[VIP+]";
    if (player.newPackageRank === "MVP") return "[MVP]";
    if (player.newPackageRank === "MVP_PLUS") return "[MVP+]";
    if (player.packageRank === "VIP") return "[VIP]";
    if (player.packageRank === "VIP_PLUS") return "[VIP+]";
    if (player.packageRank === "MVP") return "[MVP]";
    if (player.packageRank === "MVP_PLUS") return "[MVP+]";
    return "";
}

// https://hypixel.net/threads/bedwars-level-experience-guide-2023-updated-version.5431988/
function getBedWarsLevel(exp: number) {
    return getGamemodeLevel(exp, [500, 1000, 2000, 3500], 5000, 487000);
}

// https://github.com/HypixelDev/PublicAPI/wiki/Common-Questions
function getNetworkLevel(exp: number) {
    return (Math.sqrt(exp + 15312.5) - 125 / Math.SQRT2) / (25 * Math.SQRT2);
}

// https://hypixel.net/threads/guide-levels-and-prestiges-in-skywars.3172475/
function getSkyWarsLevel(exp: number) {
    return getGamemodeLevel(
        exp,
        [0, 20, 50, 80, 100, 250, 500, 1000, 1500, 2500, 4000, 5000],
        10000
    );
}

// magic (akin to bedwars)
function getWoolGamesLevel(exp: number) {
    return getGamemodeLevel(exp, [0, 1000, 2000, 3000, 4000], 5000, 490000);
}

function getGamemodeLevel(
    exp: number,
    expReqs: number[],
    onwardExpReq: number,
    prestigeCost = -1
) {
    let level = 0;
    if (prestigeCost !== -1) {
        const prestiges = Math.floor(exp / prestigeCost);
        level = prestiges * 100;
        exp %= prestigeCost;
    }
    for (const expReq of expReqs) {
        if (exp < expReq) {
            return level + exp / expReq;
        }
        level++;
        exp -= expReq;
    }
    return level + exp / onwardExpReq;
}

// All the arcade gamemodes
function getArcadeWins(arcade: any) {
    if (!arcade) return 0;
    const blockingDeadWins = Number(arcade.wins_dayone ?? 0);
    const bountyHuntersWins = Number(arcade.wins_oneinthequiver ?? 0);
    const dragonWarsWins = Number(arcade.wins_dragonwars2 ?? 0);
    const dropperWins = Number(arcade.dropper?.wins ?? 0);
    const enderSpleefWins = Number(arcade.wins_ender ?? 0);
    const farmHuntWins = Number(arcade.wins_farm_hunt ?? 0);
    const footballWins = Number(arcade.wins_soccer ?? 0);
    const galaxyWarsWins = Number(arcade.sw_game_wins ?? 0);
    const hideAndSeekWins =
        Number(arcade.seeker_wins_hide_and_seek ?? 0) +
        Number(arcade.hider_wins_hide_and_seek ?? 0);
    const holeInTheWallWins = Number(arcade.wins_hole_in_the_wall ?? 0);
    const hypixelSaysWins = Number(arcade.wins_simon_says ?? 0);
    const miniWallsWins = Number(arcade.wins_mini_walls ?? 0);
    const partyGamesWins =
        Number(arcade.wins_party ?? 0) +
        Number(arcade.wins_party_2 ?? 0) +
        Number(arcade.wins_party_3 ?? 0);
    const pixelPaintersWins = Number(arcade.wins_draw_their_thing ?? 0);
    const pixelPartyWins = Number(arcade.pixel_party?.wins ?? 0);
    const throwOutWins = Number(arcade.wins_throw_out ?? 0);
    const zombiesWins = Number(arcade.wins_zombies ?? 0);
    const seasonalWins =
        Number(arcade.wins_easter_simulator ?? 0) +
        Number(arcade.wins_grinch_simulator_v2 ?? 0) +
        Number(arcade.wins_halloween_simulator ?? 0) +
        Number(arcade.wins_scuba_simulator ?? 0);

    return (
        blockingDeadWins +
        bountyHuntersWins +
        dragonWarsWins +
        dropperWins +
        enderSpleefWins +
        farmHuntWins +
        footballWins +
        galaxyWarsWins +
        hideAndSeekWins +
        holeInTheWallWins +
        hypixelSaysWins +
        miniWallsWins +
        partyGamesWins +
        pixelPaintersWins +
        pixelPartyWins +
        throwOutWins +
        zombiesWins +
        seasonalWins
    );
}
