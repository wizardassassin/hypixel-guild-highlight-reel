import cron from "node-cron";
import { getGuildData, updateGuild } from "./db-update.js";
import { sleep } from "./utils.js";
import prisma from "./db.js";
import { DateTime } from "luxon";
import assert from "assert/strict";

async function dailyCron() {
    const dateObj = DateTime.now().setZone("America/New_York");
    const dateYesterday = dateObj.startOf("day");
    const dateToday = dateYesterday.plus({ days: 1 });
    assert.equal(
        dateToday.toMillis(),
        dateObj.plus({ minutes: 5 }).startOf("day").toMillis()
    );
    try {
        const guilds = await prisma.guild.findMany();
        await Promise.all(
            guilds.map(async (guild) => {
                const guildData = await getGuildData(
                    guild.guildIdHypixel,
                    dateToday.toJSDate()
                );
                await updateGuild(guild.id, guildData);
            })
        );
        return true;
    } catch (error) {
        console.error(error);
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
