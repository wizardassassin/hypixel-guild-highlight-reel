import fs from "fs";
import { REST } from "@discordjs/rest";
import { APIApplicationCommandSubcommandOption, Routes } from "discord.js";

const cwd = import.meta.dirname;

const guildId = process.env.DISCORD_GUILD_ID;
const clientId = process.env.DISCORD_CLIENT_ID;
const token = process.env.DISCORD_BOT_TOKEN;

const commands = [];
const commandFiles = fs
    .readdirSync(cwd + `/commands`)
    .filter((file) => fs.lstatSync(cwd + `/commands/${file}`).isFile())
    .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);

try {
    console.log(
        `Started refreshing ${commands.length} application (/) commands.`
    );

    const route =
        process.env.NODE_ENV === "production"
            ? Routes.applicationCommands(clientId)
            : Routes.applicationGuildCommands(clientId, guildId);

    const data = (await rest.put(route, {
        body: commands,
    })) as Array<APIApplicationCommandSubcommandOption>;

    console.log(
        `Successfully reloaded ${data.length} application (/) commands.`
    );
} catch (error) {
    console.error(error);
}
