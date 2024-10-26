import {
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { createGuild } from "../db-update.js";
import { fetchUUID } from "../skin-fetcher.js";

export const data = new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connects a discord server with a hypixel guild!")
    .addStringOption((option) =>
        option
            .setName("username")
            .setDescription("The username of a member in the guild.")
            .setRequired(true)
    )
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setDescription("The channel to put the recaps in.")
            .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    const username = interaction.options.getString("username", true);
    const channel = interaction.options.getChannel("channel", true);
    if (!(channel instanceof TextChannel)) {
        return;
    }
    const playerUUID = await fetchUUID(username);
    const guildId = interaction.guild.id;
    const data = await interaction.client.db.guild.findUnique({
        where: {
            guildIdDiscord: guildId,
        },
    });
    if (!data) {
        const data = await createGuild(guildId, channel.id, playerUUID);
        await interaction.reply(`Connected server to "${data.name}"`);
        return;
    }
    await interaction.reply(
        `The server is already connected. It is connected to "${data.name}"`
    );
}
