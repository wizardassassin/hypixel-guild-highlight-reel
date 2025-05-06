import cron from "node-cron";
import { getGuildData, updateGuild } from "./db/db-update.js";
import { sleep } from "./utils/utils.js";
import prisma from "./db/db.js";
import { DateTime } from "luxon";
import assert from "assert/strict";
import { setBlob } from "./db/blob-util.js";

const guildId = process.env.DISCORD_GUILD_ID;

async function dailyCron() {
    const dateObj = DateTime.now().setZone("America/New_York");
    const dateYesterday = dateObj.startOf("day");
    const dateToday = dateYesterday.plus({ days: 1 });
    assert.equal(
        dateToday.toMillis(),
        dateObj.plus({ minutes: 5 }).startOf("day").toMillis()
    );
    const housingStore: Parameters<typeof getGuildData>[2] = [];
    try {
        const guild = await prisma.guild.findUnique({
            where: {
                guildIdDiscord: guildId,
            },
        });
        const guildData = await getGuildData(
            guild.guildIdHypixel,
            dateToday.toJSDate(),
            housingStore
        );
        await updateGuild(guild.id, guildData);
        return true;
    } catch (error) {
        console.error(error);
        if (housingStore.length !== 0) {
            setBlob("cookie_cache", Buffer.from(JSON.stringify(housingStore)));
        }
        return false;
    }
}

export function initCron(
    callback: (
        cronType: "DAILY" | "WEEKLY",
        cronPromise: Promise<boolean>
    ) => any
) {
    cron.schedule(
        "55 23 * * *",
        () =>
            callback(
                "DAILY",
                new Promise((res) => dailyCron().then((res2) => res(res2)))
            ),
        {
            timezone: "America/New_York",
        }
    );
}
