import { Client } from "discord.js";

const guildId = process.env.DISCORD_GUILD_ID;

export async function onCron(
    client: Client<true>,
    cronType: string,
    cronPromise: Promise<boolean>
) {
    const message = await client.instanceChannel.send("Fetching data...");
    console.time("Elapsed");
    const didSucceed = await cronPromise;
    console.timeEnd("Elapsed");
    console.log("Fetch Succeeded:", didSucceed);
    await message.edit(
        "Fetching data..." + (didSucceed ? "Success" : "Failed")
    );
}
