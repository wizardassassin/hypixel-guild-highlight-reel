import {
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({
        content: "Pinging...",
        fetchReply: true,
    });
    await interaction.editReply(
        `\`Websocket heartbeat:\` ${
            interaction.client.ws.ping
        }ms.\n\`Roundtrip latency:\` ${
            sent.createdTimestamp - interaction.createdTimestamp
        }ms`
    );
}
