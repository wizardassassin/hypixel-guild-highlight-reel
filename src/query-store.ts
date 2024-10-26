import cron from "node-cron";
import { updateGuild, updateHousingData } from "./db-update.js";
import { retryer, sleep } from "./utils.js";
import prisma from "./db.js";

async function dailyCron() {
    await sleep(1000); // One second buffer
    try {
        const guilds = await prisma.guild.findMany();
        for (const guild of guilds) {
            await updateGuild(guild.guildIdHypixel, guild.id);
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function weeklyCron() {
    try {
        const guilds = await prisma.guild.findMany();
        for (const guild of guilds) {
            await updateHousingData(guild.guildIdHypixel);
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function initCron(
    callback: (
        cronType: "DAILY" | "WEEKLY",
        cronPromise: Promise<boolean>
    ) => any
) {
    cron.schedule(
        "30 0 0 * * *",
        () =>
            callback(
                "DAILY",
                new Promise((res) => dailyCron().then((res2) => res(res2)))
            ),
        {
            timezone: "America/New_York",
        }
    );

    cron.schedule(
        "30 29 9 * * 0",
        () =>
            callback(
                "WEEKLY",
                new Promise((res) => weeklyCron().then((res2) => res(res2)))
            ),
        {
            timezone: "America/New_York",
        }
    );
}
