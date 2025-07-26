import { DateTime } from "luxon";
import prisma from "../db/db.js";
import fs from "fs/promises";
import crypto from "crypto";
import zlib from "zlib";
import lzma from "lzma-native";
import util from "util";
import {
    getSkyBlockEndpointData,
    parseGuildEndpointData,
    parseHousingEndpointData,
    parsePlayerEndpointData,
    parseSkyBlockEndpointData,
} from "../query/hypixel-fetcher.js";
import { getGuildData, updateGuild } from "../db/db-update.js";
import { sleep } from "../utils/utils.js";
import { decompressData } from "../utils/seed-util.js";

const guildId = process.env.DISCORD_GUILD_ID;

const guild = await prisma.guild.findUnique({
    where: {
        guildIdDiscord: guildId,
    },
});
async function seedFile(filename: string) {
    console.log("Seeding:", filename);
    console.time("Decompress");
    const timestamp = Number(filename.split("_")[0]);
    const rawHash = String(filename.split("_")[1]);
    const file = await fs.readFile("./blob/" + filename);
    const json = JSON.parse((await decompressData(file)).toString());
    const guildData = parseGuildEndpointData(json.guildData);
    const memberUUIDs = guildData.members.map((x) => x.uuid);
    const manualData = {
        memberUUIDs: memberUUIDs,
        guildData: guildData,
        playerData: (json.playerData as any[]).map((x, i) =>
            parsePlayerEndpointData(x)
        ),
        skyblockData: (json.skyblockData as any[]).map((x, i) =>
            parseSkyBlockEndpointData(x, memberUUIDs[i])
        ),
        housingData: (json.housingData as any[]).map((x, i) =>
            parseHousingEndpointData(x, memberUUIDs[i])
        ),
    };
    const dateObj = DateTime.fromMillis(timestamp).setZone("America/New_York");
    console.timeEnd("Decompress");
    await updateGuild(guild.id, manualData, dateObj, rawHash);
}
const stats = await prisma.guildStats.findMany();
const hashes = stats.map((x) => x.rawDataHash);
const files = (await fs.readdir("./blob/"))
    .filter((x) => !x.startsWith(".") && x.length === 78)
    .filter((x) => !hashes.includes(x.split("_")[1]));
for (const file of files) {
    await seedFile(file);
}
