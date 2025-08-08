import { createGuild, updateGuild } from "./db/db-update.js";
import {
    getGuildEndpointData,
    getPlayerEndpointData,
} from "./query/hypixel-fetcher.js";
import cron from "node-cron";
import fs from "fs";
import {
    ActivityType,
    Client,
    Collection,
    Events,
    IntentsBitField,
    MessageFlags,
    TextChannel,
} from "discord.js";
import { GenericCommandModule } from "./types/discord.js";
import db from "./db/db.js";
import { initCron } from "./query-store.js";
import { onCron } from "./query-informer.js";

const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
    ],
    presence: {
        activities: [{ name: "Minecraft", type: ActivityType.Playing }],
        status: "online",
    },
});

client.commands = new Collection<string, GenericCommandModule>();
client.db = db;

const cwd = import.meta.dirname;

const commandFiles = fs
    .readdirSync(cwd + `/commands`)
    .filter((file) => fs.lstatSync(cwd + `/commands/${file}`).isFile())
    .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = (await import(
        `./commands/${file}`
    )) as GenericCommandModule;
    client.commands.set(command.data.name, command);
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(
            `No command matching ${interaction.commandName} was found.`
        );
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
});

client.once(Events.ClientReady, (readyClient) => {
    const channel = readyClient.channels.cache.get(channelId);
    if (channel instanceof TextChannel) {
        readyClient.instanceChannel = channel;
    } else {
        console.error("Invalid Channel ID");
    }
    readyClient.cronIsRunning = false;
    if (
        process.env.NODE_ENV === "production" ||
        process.env.FETCH_IN_DEV !== "false"
    ) {
        initCron((cronType, cronPromise) =>
            onCron(readyClient, cronType, cronPromise)
        );
    }
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.Error, console.error);

client.login(token);
