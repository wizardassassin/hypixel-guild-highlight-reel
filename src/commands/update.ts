import {
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { updateGuilds } from "../db-update.js";

export const data = new SlashCommandBuilder()
    .setName("update")
    .setDescription("Updates!")
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    await updateGuilds();
    await interaction.editReply("Done!");
}
