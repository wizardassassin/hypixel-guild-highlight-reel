import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";

export const data = new SlashCommandBuilder()
    .setName("metainfo")
    .setDescription("Gets meta information about the bot.")
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    const data = await interaction.client.db.guildStats.findMany({
        select: {
            createdAt: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
    if (data.length === 0) {
        await interaction.reply("The bot currently has no data.");
        return;
    }
    const data2 = data.map((x) => x.createdAt);

    const firstDate = data2.at(0);
    const lastDate = data2.at(-1);
    const dateObj = DateTime.now().setZone("America/New_York");
    const dateToday = dateObj.startOf("day");
    const missingDates = getMissingDates(
        firstDate,
        dateToday.toJSDate(),
        data2
    );
    const lastFetch = Math.floor(dateToday.toMillis() / 1000);
    const nextFetch = Math.floor(dateToday.plus({ days: 1 }).toMillis() / 1000);
    const embed = new EmbedBuilder().setTitle("Guild Stats Metadata").addFields(
        {
            name: "Date Range",
            value: `${dateToFormat(firstDate)} - ${dateToFormat(lastDate)}`,
        },
        {
            name: "Last Data Fetch",
            value:
                `<t:${lastFetch}:R> - ` +
                (lastDate.getTime() === dateToday.toMillis()
                    ? "Success!"
                    : interaction.client.cronIsRunning
                    ? "In progress."
                    : "Failed. ⚠️"),
        },
        { name: "Next Data Fetch", value: `<t:${nextFetch}:R>` },
        { name: "Missing Dates", value: missingDates }
    );
    await interaction.reply({
        embeds: [embed],
    });
}

function getMissingDates(firstDate: Date, lastDate: Date, data2: Date[]) {
    let output = "";
    const availDates = new Set(data2.map((x) => x.getTime()));
    let date = DateTime.fromJSDate(firstDate, { zone: "America/New_York" });
    date = date.plus({ days: 1 });
    while (date.toMillis() <= lastDate.getTime()) {
        if (!availDates.has(date.toMillis())) {
            output += `⚠️${dateToFormat(date.toJSDate())}⚠️\n`;
        }
        date = date.plus({ days: 1 });
    }
    return output || "No dates are missing.";
}

function dateToFormat(date: Date) {
    return DateTime.fromJSDate(date, { zone: "America/New_York" }).toFormat(
        "MM/dd/yy"
    );
}
