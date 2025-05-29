import db from "../db/db.ts";
import "discord.js";

import {
    Collection,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    ChatInputCommandInteraction,
    TextChannel,
} from "discord.js";

interface GenericCommandModule {
    readonly data:
        | SlashCommandBuilder
        | SlashCommandSubcommandBuilder
        | SlashCommandSubcommandGroupBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

declare module "discord.js" {
    export interface Client {
        commands: Collection<string, GenericCommandModule>;
        instanceChannel: TextChannel;
        cronIsRunning: boolean;
        db: typeof db;
    }
}
