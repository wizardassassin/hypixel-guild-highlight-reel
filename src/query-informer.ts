import { Client } from "discord.js";
import { DateTime } from "luxon";
import { createGuildRecap } from "./recap-format.js";

const guildId = process.env.DISCORD_GUILD_ID;

export async function onCron(
    client: Client<true>,
    cronType: string,
    cronPromise: Promise<boolean>
) {
    console.log("Fetching Data");
    client.cronIsRunning = true;
    console.time("Elapsed");
    const didSucceed = await cronPromise;
    console.timeEnd("Elapsed");
    client.cronIsRunning = false;
    console.log("Fetch Succeeded:", didSucceed);
    if (!didSucceed) {
        await client.instanceChannel.send("⚠️ ⚠️ Fetching Data Failed ⚠️ ⚠️");
    }
    if (didSucceed) {
        const dateObj = DateTime.now().setZone("America/New_York");
        const dateToday = dateObj.startOf("day");
        if (isStartOfWeek(dateObj)) {
            await createGuildRecap(
                guildId,
                dateToday.minus({ weeks: 1 }),
                dateToday,
                "Weekly Guild Highlight",
                (content) => client.instanceChannel.send(content),
                true
            );
        }
        if (isStartOfMonth(dateObj)) {
            await createGuildRecap(
                guildId,
                dateToday.minus({ months: 1 }),
                dateToday,
                "Monthly Guild Recap",
                (content) => client.instanceChannel.send(content),
                true
            );
        }
        if (isStartOfYear(dateObj)) {
            await createGuildRecap(
                guildId,
                dateToday.minus({ years: 1 }),
                dateToday,
                "Yearly Guild Retrospective",
                (content) => client.instanceChannel.send(content),
                true
            );
        }
    }
}

function isStartOfYear(dateObj: DateTime<true> | DateTime<false>) {
    const dateYear = dateObj.startOf("year");
    const dateToday = dateObj.startOf("day");
    return dateYear.toMillis() === dateToday.toMillis();
}

function isStartOfMonth(dateObj: DateTime<true> | DateTime<false>) {
    const dateMonth = dateObj.startOf("month");
    const dateToday = dateObj.startOf("day");
    return dateMonth.toMillis() === dateToday.toMillis();
}

function isStartOfWeek(dateObj: DateTime<true> | DateTime<false>) {
    const dateWeek = dateObj
        .plus({ days: 1 })
        .startOf("week")
        .minus({ days: 1 });
    const dateToday = dateObj.startOf("day");
    return dateWeek.toMillis() === dateToday.toMillis();
}
