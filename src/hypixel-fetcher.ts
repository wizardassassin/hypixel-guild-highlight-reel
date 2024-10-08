import fs from "fs/promises";
// TODO: housing, skyblock

export type GuildEndpointType = Awaited<
    ReturnType<typeof getGuildEndpointData>
>;

export async function getGuildEndpointData(
    uuid: string,
    idType: "PLAYER" | "GUILD" = "PLAYER"
) {
    const url =
        idType === "PLAYER"
            ? `https://api.hypixel.net/v2/guild?player=${uuid}`
            : `https://api.hypixel.net/v2/guild?id=${uuid}`;
    const res = await fetch(url, {
        headers: {
            "API-Key": process.env.HYPIXEL_API_KEY,
        },
    });
    const json = await res.json();
    const guild = json.guild;
    const members = (guild.members as any[]).map((x) => ({
        uuid: x.uuid as string,
        joined: x.joined as number,
        expHistory: Object.entries(x.expHistory as { [key: string]: number })
            .map(([key, value]) => [new Date(key), value] as [Date, number])
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
        members,
    };
}

export type PlayerEndpointType = Awaited<
    ReturnType<typeof getPlayerEndpointData>
>;

export async function getPlayerEndpointData(uuid: string) {
    const res = await fetch(`https://api.hypixel.net/v2/player?uuid=${uuid}`, {
        headers: {
            "API-Key": process.env.HYPIXEL_API_KEY,
        },
    });
    const json = await res.json();
    // await fs.writeFile("./player.json", JSON.stringify(json, null, 4));
    const player = json.player;
    const stats = player.stats;
    const playerStats = {
        achievementPoints: Number(player.achievementPoints ?? 0),
        arcadeWins: getArcadeWins(stats?.Arcade),
        arcadeWinsWithTourney:
            getArcadeWins(stats?.Arcade) +
            Number(stats?.Arcade?.wins_grinch_simulator_v2_tourney ?? 0) +
            Number(
                stats?.Arcade
                    ?.wins_grinch_simulator_v2_tourney_grinch_simulator_1 ?? 0
            ) +
            Number(
                stats?.Arcade
                    ?.wins_grinch_simulator_v2_tourney_grinch_simulator_1 ?? 0
            ) +
            Number(stats?.Arcade?.wins_tourney_mini_walls_0 ?? 0) +
            Number(stats?.Arcade?.wins_ss_SANTA_SIMULATOR ?? 0) +
            Number(stats?.Arcade?.wins_santa_simulator ?? 0), // wins_ss_SANTA_SIMULATOR wins_santa_simulator ??
        arenaBrawlWins: Number(stats?.Arena?.wins ?? 0),
        arenaBrawlKills:
            Number(stats?.Arena?.kills_1v1 ?? 0) +
            Number(stats?.Arena?.kills_2v2 ?? 0) +
            Number(stats?.Arena?.kills_4v4 ?? 0),
        bedWarsExp: Number(stats?.Bedwars?.Experience ?? 0),
        bedWarsLevel: getBedWarsLevel(Number(stats?.Bedwars?.Experience ?? 0)),
        bedWarsWins: Number(stats?.Bedwars?.wins_bedwars ?? 0),
        bedWarsWinsWithTourney:
            Number(stats?.Bedwars?.wins_bedwars ?? 0) +
            Number(stats?.Bedwars?.tourney_bedwars4s_0_wins_bedwars ?? 0) +
            Number(
                stats?.Bedwars?.tourney_bedwars_two_four_0_wins_bedwars ?? 0
            ) +
            Number(stats?.Bedwars?.tourney_bedwars4s_1_wins_bedwars ?? 0) +
            Number(
                stats?.Bedwars?.tourney_bedwars_eight_two_0_wins_bedwars ?? 0
            ) +
            Number(
                stats?.Bedwars?.tourney_bedwars_eight_two_1_wins_bedwars ?? 0
            ),
        bedWarsKills: Number(stats?.Bedwars?.kills_bedwars ?? 0),
        bedWarsKillsWithTourney:
            Number(stats?.Bedwars?.kills_bedwars ?? 0) +
            Number(stats?.Bedwars?.tourney_bedwars4s_0_kills_bedwars ?? 0) +
            Number(
                stats?.Bedwars?.tourney_bedwars_two_four_0_kills_bedwars ?? 0
            ) +
            Number(stats?.Bedwars?.tourney_bedwars4s_1_kills_bedwars ?? 0) +
            Number(
                stats?.Bedwars?.tourney_bedwars_eight_two_0_kills_bedwars ?? 0
            ) +
            Number(
                stats?.Bedwars?.tourney_bedwars_eight_two_1_kills_bedwars ?? 0
            ),
        blitzSGKills: Number(stats?.HungerGames?.kills ?? 0),
        blitzSGKillsWithTourney:
            Number(stats?.HungerGames?.kills ?? 0) +
            Number(stats?.HungerGames?.tourney_blitz_duo_0_kills ?? 0) +
            Number(stats?.HungerGames?.tourney_blitz_duo_1_kills_teams ?? 0) +
            Number(stats?.HungerGames?.tourney_blitz_duo_2_kills_teams ?? 0),
        blitzSGWins:
            Number(stats?.HungerGames?.wins_solo_normal ?? 0) +
            Number(stats?.HungerGames?.wins_teams ?? 0),
        blitzSGWinsWithTourney:
            Number(stats?.HungerGames?.wins_solo_normal ?? 0) +
            Number(stats?.HungerGames?.wins_teams ?? 0) +
            Number(stats?.HungerGames?.wins_solo_chaos ?? 0) +
            Number(stats?.HungerGames?.tourney_blitz_duo_0_wins_teams ?? 0) +
            Number(stats?.HungerGames?.tourney_blitz_duo_1_wins_teams ?? 0) +
            Number(stats?.HungerGames?.tourney_blitz_duo_2_wins_teams ?? 0),
        buildBattleScore: Number(stats?.BuildBattle?.score ?? 0),
        buildBattleWins: Number(stats?.BuildBattle?.wins ?? 0),
        copsAndCrimsKills:
            Number(stats?.MCGO?.kills ?? 0) +
            Number(stats?.MCGO?.kills_deathmatch ?? 0) +
            Number(stats?.MCGO?.kills_gungame ?? 0),
        copsAndCrimsKillsWithTourney:
            Number(stats?.MCGO?.kills ?? 0) +
            Number(stats?.MCGO?.kills_deathmatch ?? 0) +
            Number(stats?.MCGO?.kills_gungame ?? 0) +
            Number(stats?.MCGO?.kills_tourney_mcgo_defusal_0 ?? 0) +
            Number(stats?.MCGO?.kills_tourney_mcgo_defusal_1 ?? 0),
        copsAndCrimsWins:
            Number(stats?.MCGO?.kills ?? 0) +
            Number(stats?.MCGO?.kills_deathmatch ?? 0) +
            Number(stats?.MCGO?.kills_gungame ?? 0),
        copsAndCrimsWinsWithTourney:
            Number(stats?.MCGO?.kills ?? 0) +
            Number(stats?.MCGO?.kills_deathmatch ?? 0) +
            Number(stats?.MCGO?.kills_gungame ?? 0) +
            Number(stats?.MCGO?.game_wins_tourney_mcgo_defusal_0 ?? 0) +
            Number(stats?.MCGO?.game_wins_tourney_mcgo_defusal_1 ?? 0),
        duelsWins: Number(stats?.Duels?.wins ?? 0),
        duelsKills: Number(stats?.Duels?.kills ?? 0),
        hypixelExp: Number(player.networkExp ?? 0),
        hypixelLevel: getNetworkLevel(Number(player.networkExp ?? 0)),
        karma: Number(player.karma ?? 0),
        megaWallsWins: Number(stats?.Walls3?.wins ?? 0), // tourney included
        megaWallsKills: Number(stats?.Walls3?.kills ?? 0),
        murderMysteryWins: Number(stats?.MurderMystery?.wins ?? 0),
        paintballKills: Number(stats?.Paintball?.kills),
        paintballWins: Number(stats?.Paintball?.wins),
        pitExp: Number(stats?.Pit?.profile?.xp ?? 0),
        pitPrestige: Number(stats?.Pit?.profile?.prestiges?.length ?? 0),
        pitKills: Number(stats?.Pit?.pit_stats_ptl?.kills ?? 0),
        quakecraftKills:
            Number(stats?.Quake?.kills ?? 0) +
            Number(stats?.Quake?.kills_teams ?? 0),
        quakecraftKillsWithTourney:
            Number(stats?.Quake?.kills ?? 0) +
            Number(stats?.Quake?.kills_teams ?? 0) +
            Number(stats?.Quake?.kills_solo_tourney ?? 0) +
            Number(stats?.Quake?.kills_tourney_quake_solo2_1 ?? 0),
        quakecraftWins:
            Number(stats?.Quake?.wins ?? 0) +
            Number(stats?.Quake?.wins_teams ?? 0),
        quakecraftWinsWithTourney:
            Number(stats?.Quake?.wins ?? 0) +
            Number(stats?.Quake?.wins_teams ?? 0) +
            Number(stats?.Quake?.wins_solo_tourney ?? 0) +
            Number(stats?.Quake?.wins_tourney_quake_solo2_1 ?? 0),
        questsCompleted: Object.values(player.quests ?? {})
            .map((x: any) => Number(x.completions?.length ?? 0))
            .reduce((a, b) => a + b, 0),
        skyWarsExp: Number(stats?.SkyWars?.skywars_experience ?? 0),
        skyWarsLevel: getSkyWarsLevel(
            Number(stats?.SkyWars?.skywars_experience ?? 0)
        ),
        skyWarsLuckyBlockWins: Number(
            stats?.SkyWars?.lab_win_lucky_blocks_lab ?? 0
        ),
        skyWarsWins: Number(stats?.SkyWars?.wins ?? 0),
        skyWarsWinsWithTourney:
            Number(stats?.SkyWars?.wins ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_crazy_solo_0_wins ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_insane_doubles_0_wins ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_insane_doubles_1_wins ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_normal_doubles_0_wins ?? 0),
        skyWarsKills: Number(stats?.SkyWars?.kills ?? 0),
        skyWarsKillsWithTourney:
            Number(stats?.SkyWars?.kills ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_crazy_solo_0_kills ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_insane_doubles_0_kills ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_insane_doubles_1_kills ?? 0) +
            Number(stats?.SkyWars?.tourney_sw_normal_doubles_0_kills ?? 0),
        skyblockLevel: Number(player?.achievements?.skyblock_sb_levels ?? 0),
        smashHeroesLevel: Number(stats?.SuperSmash?.smashLevel ?? 0), // smash_level_total
        smashHeroesWins: Number(stats?.SuperSmash?.wins ?? 0),
        smashHeroesKins: Number(stats?.SuperSmash?.kills ?? 0),
        speedUHCScore: Number(stats?.SpeedUHC?.score ?? 0),
        speedUHCwins: Number(stats?.SpeedUHC?.wins ?? 0),
        turboKartRacersTrophies:
            Number(stats?.GingerBread?.bronze_trophy ?? 0) +
            Number(stats?.GingerBread?.silver_trophy ?? 0) +
            Number(stats?.GingerBread?.gold_trophy ?? 0),
        turboKartRacersTrophiesWithTourney:
            Number(stats?.GingerBread?.bronze_trophy ?? 0) +
            Number(stats?.GingerBread?.silver_trophy ?? 0) +
            Number(stats?.GingerBread?.gold_trophy ?? 0) +
            Number(
                stats?.GingerBread?.tourney_gingerbread_solo_0_bronze_trophy ??
                    0
            ) +
            Number(
                stats?.GingerBread?.tourney_gingerbread_solo_0_silver_trophy ??
                    0
            ) +
            Number(
                stats?.GingerBread?.tourney_gingerbread_solo_0_gold_trophy ?? 0
            ) +
            Number(
                stats?.GingerBread?.tourney_gingerbread_solo_1_bronze_trophy ??
                    0
            ) +
            Number(
                stats?.GingerBread?.tourney_gingerbread_solo_1_silver_trophy ??
                    0
            ) +
            Number(
                stats?.GingerBread?.tourney_gingerbread_solo_1_gold_trophy ?? 0
            ),
        tntGamesWins: Number(stats?.TNTGames?.wins ?? 0),
        tntGamesWinsWithTourney:
            Number(stats?.TNTGames?.wins ?? 0) +
            Number(stats?.TNTGames?.wins_tourney_tnt_run_0 ?? 0) +
            Number(stats?.TNTGames?.wins_tourney_tnt_run_1 ?? 0),
        uhcScore: Number(stats?.UHC?.score ?? 0),
        uhcWins: Number(stats?.UHC?.wins ?? 0),
        uhcKills: Number(stats?.UHC?.kills ?? 0),
        vampireZHumanWins: Number(stats?.VampireZ?.human_wins ?? 0),
        vampireZWins:
            Number(stats?.VampireZ?.human_wins ?? 0) +
            Number(stats?.VampireZ?.vampire_wins ?? 0),
        theWallsWins: Number(stats?.Walls?.wins ?? 0), // tourney included
        warlordsWins: Number(stats?.Battleground?.wins ?? 0),
        woolGamesCombinedWins:
            Number(stats?.WoolGames?.wool_wars?.stats?.wins ?? 0) +
            Number(
                stats?.WoolGames?.capture_the_wool?.stats?.experienced_wins ?? 0
            ) +
            Number(stats?.WoolGames?.sheep_wars?.stats?.wins ?? 0),
        woolGamesCombinedWinsWithTourney:
            Number(stats?.WoolGames?.wool_wars?.stats?.wins ?? 0) +
            Number(
                stats?.WoolGames?.capture_the_wool?.stats?.experienced_wins ?? 0
            ) +
            Number(stats?.WoolGames?.sheep_wars?.stats?.wins ?? 0) +
            Number(stats?.WoolGames?.tourney?.wool_wars_0?.wins ?? 0) +
            Number(stats?.WoolGames?.tourney?.wool_wars_1?.wins ?? 0),
        woolGamesExp: Number(stats?.WoolGames?.progression?.experience ?? 0),
        woolGamesLevel: getWoolGamesLevel(
            Number(stats?.WoolGames?.progression?.experience ?? 0)
        ),
        skyClashWins: Number(stats?.SkyClash?.wins ?? 0),
        crazyWallsWins: Number(stats?.TrueCombat?.wins ?? 0),
    };

    return {
        uuid: String(player.uuid),
        username: String(player.displayname),
        playerStats,
    };
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
