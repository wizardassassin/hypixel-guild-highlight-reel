import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { fetchUUID } from "../skin-fetcher.js";
import { PlayerEndpointType } from "../hypixel-fetcher.js";

export const data = new SlashCommandBuilder()
    .setName("getstats")
    .setDescription("Gets the highlight reel of a player!")
    .addStringOption((option) =>
        option
            .setName("username")
            .setDescription("The username.")
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
    const date = new Date();
    date.setUTCHours(5 - 24, 0, 0, 0);
    const player = await interaction.client.db.player.findUnique({
        where: {
            uuid: uuid,
        },
        include: {
            PlayerStats: {
                orderBy: {
                    createdAt: "asc",
                },
                where: {
                    createdAt: {
                        gte: date,
                    },
                },
            },
        },
    });
    const playerStats = player.PlayerStats.map((x) => ({
        createdAt: x.createdAt,
        stats: {
            ...(JSON.parse(
                x.playerStats.toString()
            ) as PlayerEndpointType["playerStats"]),
            experience: x.experience,
            questParticipation: x.questParticipation,
        },
    }));
    const firstStat = playerStats.at(0);
    const lastStat = playerStats.at(-1);
    const statDiff: {
        [key: string]: number;
    } = {};
    for (const key in lastStat.stats) {
        const val1 = firstStat.stats[key] ?? 0;
        const val2 = lastStat.stats[key] ?? 0;
        if (val1 === val2) continue;
        statDiff[key] = val2 - val1;
    }
    statDiff["experience"] = lastStat.stats.experience;
    if (statDiff["experience"] === 0) {
        delete statDiff["experience"];
    }
    console.log(statDiff);
    const embed = new EmbedBuilder().addFields(
        ...Object.entries(statDiff).map(([key, value]) => ({
            name: key,
            value: String(value),
        }))
    );
    await interaction.reply({
        embeds: [embed],
    });
}
