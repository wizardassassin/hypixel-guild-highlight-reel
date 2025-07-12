import {
    sqliteTable,
    AnySQLiteColumn,
    text,
    numeric,
    integer,
    uniqueIndex,
    foreignKey,
    blob,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm/relations";

export const playerStats = sqliteTable(
    "PlayerStats",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => crypto.randomUUID()),
        createdAt: numeric({ mode: "number" })
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        playerStats: text().notNull(),
        experience: integer().notNull(),
        questParticipation: integer().notNull(),
        skyblockExperience: integer().notNull(),
        housingCookies: integer().notNull(),
        playerId: text()
            .notNull()
            .references(() => player.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        guildStatsId: text()
            .notNull()
            .references(() => guildStats.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
    },
    (table) => [
        uniqueIndex("PlayerStats_createdAt_playerId_guildStatsId_key").on(
            table.createdAt,
            table.playerId,
            table.guildStatsId
        ),
    ]
);

export const guildStats = sqliteTable(
    "GuildStats",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => crypto.randomUUID()),
        createdAt: numeric({ mode: "number" })
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        experience: integer().notNull(),
        experienceByGameType: text().notNull(),
        guildId: text()
            .notNull()
            .references(() => guild.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        rawDataHash: text().notNull(),
    },
    (table) => [
        uniqueIndex("GuildStats_createdAt_guildId_key").on(
            table.createdAt,
            table.guildId
        ),
    ]
);

export const guild = sqliteTable(
    "Guild",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => crypto.randomUUID()),
        guildIdDiscord: text().notNull(),
        guildIdHypixel: text().notNull(),
        name: text().notNull(),
        createdAtHypixel: numeric({ mode: "number" }).notNull(),
    },
    (table) => [
        uniqueIndex("Guild_guildIdHypixel_key").on(table.guildIdHypixel),
        uniqueIndex("Guild_guildIdDiscord_key").on(table.guildIdDiscord),
    ]
);

export const blobStorage = sqliteTable(
    "BlobStorage",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => crypto.randomUUID()),
        createdAt: numeric({ mode: "number" })
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        name: text().notNull(),
        blob: blob({ mode: "buffer" }).notNull(),
    },
    (table) => [uniqueIndex("BlobStorage_name_key").on(table.name)]
);

export const player = sqliteTable(
    "Player",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => crypto.randomUUID()),
        uuid: text().notNull(),
        username: text().notNull(),
        prefix: text().notNull(),
        color: integer().notNull(),
        joined: numeric({ mode: "number" }).notNull(),
        initialJoined: numeric({ mode: "number" }).notNull(),
    },
    (table) => [uniqueIndex("Player_uuid_key").on(table.uuid)]
);

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
    player: one(player, {
        fields: [playerStats.playerId],
        references: [player.id],
    }),
    guildStat: one(guildStats, {
        fields: [playerStats.guildStatsId],
        references: [guildStats.id],
    }),
}));

export const playerRelations = relations(player, ({ many }) => ({
    playerStats: many(playerStats),
}));

export const guildStatsRelations = relations(guildStats, ({ one, many }) => ({
    playerStats: many(playerStats),
    guild: one(guild, {
        fields: [guildStats.guildId],
        references: [guild.id],
    }),
}));

export const guildRelations = relations(guild, ({ many }) => ({
    guildStats: many(guildStats),
}));
