import { createGuild } from "../db/db-update.js";
import { MojangFetcher } from "../query/skin-fetcher.js";

const guildId = process.env.DISCORD_GUILD_ID;

const uuidOrName = process.env.HYPIXEL_GUILD_MEMBER_UUID;

const uuid =
    uuidOrName.length > 16
        ? uuidOrName
        : (await MojangFetcher.instance.getProfile(uuidOrName)).uuid;

const res = await createGuild(guildId, uuid);
console.log(res);
