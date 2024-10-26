import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { fetchUUID, getAvatar } from "../skin-fetcher.js";
import { PlayerEndpointType } from "../hypixel-fetcher.js";
import { DateTime } from "luxon";
import { diffPlayerStats, queryPlayerData } from "../db-query.js";

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
        option
            .setName("start")
            .setDescription("Start time (MM/dd/yyyy).")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("end")
            .setDescription("End time (MM/dd/yyyy).")
            .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    const username = interaction.options.getString("username", true);
    const uuid = await fetchUUID(username);
    if (!uuid) {
        await interaction.reply(`${username} was not found.`);
        return;
    }
    const dateNow = DateTime.now().setZone("America/New_York").startOf("day");
    const date = dateNow.toJSDate();
    const dateYesterday = dateNow.minus({ days: 1 }).toJSDate();
    const data = await queryPlayerData(uuid, dateYesterday, date);
    const data2 = diffPlayerStats(data.PlayerStats[0], data.PlayerStats[1]);
    const entries = data2.map(({ name, value }) => ({
        name: name,
        value: String(value),
    }));
    await interaction.reply({
        embeds:
            entries.length < 16
                ? [
                      new EmbedBuilder()
                          .setTitle(data.username)
                          .addFields(...entries)
                          .setThumbnail("attachment://avatar.png"),
                  ]
                : [
                      new EmbedBuilder()
                          .setTitle(data.username)
                          .addFields(...entries.slice(0, entries.length / 2))
                          .setThumbnail("attachment://avatar.png"),
                      new EmbedBuilder().addFields(
                          ...entries.slice(entries.length / 2)
                      ),
                  ],
        files: [
            new AttachmentBuilder(await getAvatar(username, 128), {
                name: "avatar.png",
            }),
        ],
    });
}
