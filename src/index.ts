import { createGuild, updateGuilds } from "./db-update.js";
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

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const retryer = async (
    func: () => any,
    retryTimes = [60, 300, 300, 600, 600]
) => {
    try {
        console.log("Running job");
        console.time("Job");
        await func();
        console.timeEnd("Job");
    } catch (error) {
        console.timeEnd("Job");
        console.error(error);
        if (retryTimes.length > 0) {
            console.error(`Retrying in ${retryTimes[0]} seconds`);
            await sleep(retryTimes[0]);
            await retryer(func, retryTimes.slice(1));
        } else {
            console.error("Failed job");
        }
    }
};

// "30 0 0 * * *"
client.once(Events.ClientReady, (readyClient) => {
    cron.schedule("30 0 0 * * *", () => retryer(updateGuilds), {
        timezone: "America/New_York",
    });
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.Error, console.error);

client.login(token);
