import { createGuild, updateGuild } from "./db-update.js";
import {
    getGuildEndpointData,
    getPlayerEndpointData,
} from "./hypixel-fetcher.js";
import cron from "node-cron";
import fs from "fs";
import {
    ActivityType,
    Client,
    Collection,
    Events,
    IntentsBitField,
} from "discord.js";
import { GenericCommandModule } from "./types/discord.js";
import prisma from "./db.js";
import { retryer } from "./utils.js";
import { initCron } from "./query-store.js";

const token = process.env.DISCORD_BOT_TOKEN;

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
    presence: {
        activities: [{ name: "Minecraft", type: ActivityType.Playing }],
        status: "online",
    },
});

client.commands = new Collection<string, GenericCommandModule>();
client.db = prisma;

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
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: "There was an error while executing this command!",
                ephemeral: true,
            });
        }
    }
});

client.once(Events.ClientReady, (readyClient) => {
    initCron(async (cronType, cronPromise) => {
        console.log(cronType);
        console.time("Elapsed");
        console.log(await cronPromise);
        console.timeEnd("Elapsed");
    });
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.Error, console.error);

client.login(token);