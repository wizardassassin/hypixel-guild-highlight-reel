import {
    Client,
    ComponentType,
    MessageFlags,
    SectionBuilder,
} from "discord.js";
import { DateTime } from "luxon";
import { createGuildHighlight } from "./recap-format.js";

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
        await createHighlights(client);
    }
}

export async function createHighlights(client: Client<true>) {
    const dateObj = DateTime.now().setZone("America/New_York");
    const dateToday = dateObj.startOf("day");
    if (isStartOfWeek(dateObj)) {
        await createGuildHighlight(
            guildId,
            dateToday.minus({ weeks: 1 }),
            dateToday,
            "Weekly Guild Highlight",
            (message) =>
                client.instanceChannel.send({
                    flags: MessageFlags.IsComponentsV2,
                    ...message,
                }),
            client.instanceChannel.guild.iconURL()
        );
    }
    if (isStartOfMonth(dateObj)) {
        await createGuildHighlight(
            guildId,
            dateToday.minus({ months: 1 }),
            dateToday,
            "Monthly Guild Highlight",
            (message) =>
                client.instanceChannel.send({
                    flags: MessageFlags.IsComponentsV2,
                    ...message,
                }),
            client.instanceChannel.guild.iconURL()
        );
    }
    if (isStartOfYear(dateObj)) {
        await createGuildHighlight(
            guildId,
            dateToday.minus({ years: 1 }),
            dateToday,
            "Yearly Guild Highlight",
            (message) =>
                client.instanceChannel.send({
                    flags: MessageFlags.IsComponentsV2,
                    ...message,
                }),
            client.instanceChannel.guild.iconURL()
        );
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
