import {
    ChatInputCommandInteraction,
    GuildMember,
    InteractionContextType,
    PermissionsBitField,
    SlashCommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";
import { createGuildHighlight } from "../recap-format.js";

export const data = new SlashCommandBuilder()
    .setName("manual-highlight")
    .setDescription("Manually sends a highlight to the highlight reel channel!")
    .addStringOption((option) =>
        option
            .setName("title")
            .setDescription("The title for the manual highlight")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("start")
            .setDescription("Start time (MM/dd/yy).")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("end")
            .setDescription("End time (MM/dd/yy).")
            .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!(interaction.member instanceof GuildMember)) return;
    const isAdmin = interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
    );
    const isDev = interaction.user.id === process.env.DISCORD_DEV_ID;
    console.log(isAdmin, isDev);

    if (!(isAdmin || isDev)) {
        await interaction.reply(
            "You don't have permission to execute this command."
        );
        return;
    }
    const title = interaction.options.getString("title", true);
    const start = interaction.options.getString("start", true);
    const end = interaction.options.getString("end", true);
    const startParsed = DateTime.fromFormat(start, "M/d/yy", {
        zone: "America/New_York",
    });
    const endParsed = DateTime.fromFormat(end, "M/d/yy", {
        zone: "America/New_York",
    });
    if (
        !startParsed.isValid ||
        !endParsed.isValid ||
        startParsed.toMillis() >= endParsed.toMillis()
    ) {
        await interaction.reply("Invalid date range selected.");
        return;
    }

    await interaction.reply("Creating guild highlight...");

    await createGuildHighlight(
        interaction.guildId,
        startParsed,
        endParsed,
        title,
        (content) => interaction.client.instanceChannel.send(content)
    );

    interaction.editReply("Creating guild highlight...Done!");
}
