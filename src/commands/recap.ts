import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";
import { diffPlayerStats, queryGuildData } from "../db-query.js";
import { createGuildRecap, createStatsEmbed } from "../recap-format.js";

export const data = new SlashCommandBuilder()
    .setName("recap")
    .setDescription("Gets a recap of the entire guild!")
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
    const dateYesterday = startParsed2;
    const dateToday = endParsed2;
    await createGuildRecap(
        interaction.guildId,
        dateYesterday,
        dateToday,
        "Custom Guild Recap",
        (content) =>
            interaction.reply({
                content: content,
                fetchReply: true,
            })
    );
}
