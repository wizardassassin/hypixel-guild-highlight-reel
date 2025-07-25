import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    escapeMarkdown,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { PlayerEndpointType } from "../query/hypixel-fetcher.js";
import { DateTime } from "luxon";
import {
    diffPlayerStats,
    queryPlayerData,
    queryPlayerDataLoose,
} from "../db/db-query.js";
import { createStatsEmbed } from "../recap-format.js";
import { MojangFetcher } from "../query/skin-fetcher.js";

export const data = new SlashCommandBuilder()
    .setName("getstats")
    .setDescription("Gets the highlight reel of a player!")
    .addStringOption((option) =>
        option
            .setName("username")
            .setDescription("The username.")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option.setName("start").setDescription("Start time (MM/dd/yy).")
    )
    .addStringOption((option) =>
        option.setName("end").setDescription("End time (MM/dd/yy).")
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    const dateObj = DateTime.now().setZone("America/New_York");
    const start = interaction.options.getString("start") ?? "";
    const end = interaction.options.getString("end") ?? "";
    const startParsed = DateTime.fromFormat(start, "M/d/yy", {
        zone: "America/New_York",
    });
    const endParsed = DateTime.fromFormat(end, "M/d/yy", {
        zone: "America/New_York",
    });
    const startParsed2 = startParsed.isValid
        ? startParsed
        : dateObj.startOf("day").minus({ days: 1 });
    const endParsed2 = endParsed.isValid ? endParsed : dateObj.startOf("day");
    if (startParsed2.toMillis() >= endParsed.toMillis()) {
        await interaction.reply(
            `The end time has to be greater than the start time.`
        );
        return;
    }
    // week aligned
    const dateYesterday = startParsed2.startOf("week").minus({ days: 1 });
    const dateToday = endParsed2.startOf("week").plus({ days: 6 });
    const username = interaction.options.getString("username", true);
    const { uuid, username: username2 } =
        await MojangFetcher.instance.getProfile(username);
    if (!uuid) {
        await interaction.reply(`${escapeMarkdown(username)} was not found.`);
        return;
    }
    const data = await queryPlayerDataLoose(
        uuid,
        dateYesterday.toJSDate(),
        dateToday.toJSDate()
    );
    const dYest = dateYesterday.toFormat("MM/dd/yy");
    const dToday = dateToday.toFormat("MM/dd/yy");
    if (
        data?.playerStats?.length !== 2 &&
        data.playerStats[0].id === data.playerStats[1].id
    ) {
        const username3 = escapeMarkdown(username2);
        await interaction.reply(
            `No data could be found for ${username3} in the range ${dYest} - ${dToday}`
        );
        return;
    }
    const playerData = diffPlayerStats(
        data.playerStats[0],
        data.playerStats[1]
    );
    const messages = await createStatsEmbed({
        username: data.username,
        uuid: data.uuid,
        prefix: data.prefix,
        color: data.color,
        diff: playerData,
        startDate: new Date(data.playerStats[0].createdAt),
        stopDate: new Date(data.playerStats[1].createdAt),
    });
    await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        ...messages[0],
    });
    for (const message of messages.slice(1)) {
        await interaction.channel.send({
            flags: MessageFlags.IsComponentsV2,
            ...message,
        });
    }
}
