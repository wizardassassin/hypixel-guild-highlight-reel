import { DateTime } from "luxon";
import prisma from "./db.js";
import fs from "fs/promises";
import crypto from "crypto";
import zlib from "zlib";
import util from "util";
import {
    getSkyBlockEndpointData,
    parseGuildEndpointData,
    parseHousingEndpointData,
    parsePlayerEndpointData,
    parseSkyBlockEndpointData,
} from "./hypixel-fetcher.js";
import { getGuildData, updateGuild } from "./db-update.js";
import { sleep } from "./utils.js";

const guild = await prisma.guild.findUnique({
    where: {
        guildIdDiscord: "***REMOVED***",
    },
});
async function seedFile(filename: string) {
    console.log("Seeding:", filename);
    const timestamp = Number(filename.split("_")[0]);
    const file = await fs.readFile("./blob/" + filename);
    const json = JSON.parse(zlib.gunzipSync(file).toString());
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
    await updateGuild(
        guild.id,
        manualData,
        DateTime.fromMillis(timestamp).setZone("America/New_York")
    );
}
await prisma.guildStats.deleteMany();
const files = (await fs.readdir("./blob/")).filter(
    (x) => !x.startsWith(".") && x.length === 78
);
for (const file of files) {
    await seedFile(file);
}
