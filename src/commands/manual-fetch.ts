import {
    ChatInputCommandInteraction,
    GuildMember,
    InteractionContextType,
    PermissionsBitField,
    SlashCommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";
import { getGuildData, updateGuild } from "../db/db-update.js";
import { getBlob, setBlob } from "../db/blob-util.js";
import { createHighlights } from "../query-informer.js";

export const data = new SlashCommandBuilder()
    .setName("manual-fetch")
    .setDescription("Refetches guild data in case data fetching failed.")
    .addBooleanOption((option) =>
        option
            .setName("cookie-cache")
            .setDescription(
                "Whether or not to use the coookie cache (if it exists)."
            )
            .setRequired(true)
    )
    .addBooleanOption((option) =>
        option
            .setName("create-highlights")
            .setDescription(
                "Whether or not to create the appropriate highlights for the current time."
            )
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!(interaction.member instanceof GuildMember)) return;
    const isAdmin = interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
    );
    const isDev = interaction.user.id === process.env.DISCORD_DEV_ID;
    if (!(isAdmin || isDev)) {
        await interaction.reply(
            "You don't have permission to execute this command."
        );
        return;
    }

    const useCache = interaction.options.getBoolean("cookie-cache", true);
    const doCreateHighlights = interaction.options.getBoolean(
        "create-highlights",
        true
    );

    const dateObj = DateTime.now().setZone("America/New_York");
    const dateToday = dateObj.startOf("day");

    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = await interaction.client.db.guild.findUnique({
        where: {
            guildIdDiscord: guildId,
        },
        include: {
            GuildStats: {
                where: {
                    createdAt: dateToday.toJSDate(),
                },
                take: 1,
            },
        },
    });

    if (guild.GuildStats?.length !== 0) {
        await interaction.reply("Guild stats entry already exists.");
        return;
    }

    const cookieCache = await getBlob("cookie_cache");

    const canUseCache =
        Date.now() - cookieCache?.createdAt.getTime() < 1000 * 60 * 60 * 24;

    if (useCache && !canUseCache) {
        await interaction.reply("Cookie Cache is not available.");
        return;
    }

    const decoder = new TextDecoder();
    const housingStore = useCache
        ? JSON.parse(decoder.decode(cookieCache.blob))
        : [];

    if (interaction.client.cronIsRunning) {
        await interaction.reply("A data fetch is already running.");
        return;
    }
    if (
        dateToday.plus({ days: 1 }).toMillis() ===
        dateObj.plus({ minutes: 10 }).startOf("day").toMillis()
    ) {
        await interaction.reply(
            "Less than 10 minutes before the next data fetch."
        );
        return;
    }
    await interaction.reply(
        `Refetching data...\nCookie Cache is ${
            canUseCache ? "Available" : "Not Available"
        }`
    );
    interaction.client.cronIsRunning = true;
    try {
        const guildData = await getGuildData(
            guild.guildIdHypixel,
            dateToday.toJSDate(),
            housingStore
        );
        await setBlob(
            "cookie_cache",
            Buffer.from(JSON.stringify(housingStore))
        );
        await updateGuild(guild.id, guildData);
        if (doCreateHighlights) {
            await createHighlights(interaction.client);
        }
        await interaction.editReply("Refetching data...Done!");
        interaction.client.cronIsRunning = false;
    } catch (error) {
        console.error(error);
        interaction.client.cronIsRunning = false;
        throw error;
    }
}
