import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";
import { diffPlayerStats, queryGuildData } from "../db/db-query.js";
import { createGuildHighlight, createStatsEmbed } from "../recap-format.js";

export const data = new SlashCommandBuilder()
    .setName("highlight")
    .setDescription("Gets a highlight of the entire guild!")
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
    if (startParsed2.toMillis() >= endParsed2.toMillis()) {
        await interaction.reply(
            `The end time has to be greater than the start time.`
        );
        return;
    }
    // week aligned
    const dateYesterday = startParsed2.startOf("week").minus({ days: 1 });
    const dateToday = endParsed2.startOf("week").plus({ days: 6 });
    await createGuildHighlight(
        interaction.guildId,
        dateYesterday,
        dateToday,
        "Custom Guild Highlight",
        (content) =>
            interaction
                .reply({
                    content: content,
                    withResponse: true,
                })
                .then((x) => x.resource.message)
    );
}
