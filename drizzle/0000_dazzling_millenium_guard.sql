CREATE TABLE `BlobStorage` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`name` text NOT NULL,
	`blob` blob NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `BlobStorage_name_key` ON `BlobStorage` (`name`);--> statement-breakpoint
CREATE TABLE `Guild` (
	`id` text PRIMARY KEY NOT NULL,
	`guildIdDiscord` text NOT NULL,
	`guildIdHypixel` text NOT NULL,
	`name` text NOT NULL,
	`createdAtHypixel` numeric NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Guild_guildIdHypixel_key` ON `Guild` (`guildIdHypixel`);--> statement-breakpoint
CREATE UNIQUE INDEX `Guild_guildIdDiscord_key` ON `Guild` (`guildIdDiscord`);--> statement-breakpoint
CREATE TABLE `GuildStats` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`experience` integer NOT NULL,
	`experienceByGameType` blob NOT NULL,
	`guildId` text NOT NULL,
	`rawDataHash` text NOT NULL,
	FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `GuildStats_createdAt_guildId_key` ON `GuildStats` (`createdAt`,`guildId`);--> statement-breakpoint
CREATE TABLE `Player` (
	`id` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`username` text NOT NULL,
	`prefix` text NOT NULL,
	`color` integer NOT NULL,
	`joined` numeric NOT NULL,
	`initialJoined` numeric NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Player_uuid_key` ON `Player` (`uuid`);--> statement-breakpoint
CREATE TABLE `PlayerStats` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`playerStats` blob NOT NULL,
	`experience` integer NOT NULL,
	`questParticipation` integer NOT NULL,
	`skyblockExperience` integer NOT NULL,
	`housingCookies` integer NOT NULL,
	`playerId` text NOT NULL,
	`guildStatsId` text NOT NULL,
	FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`guildStatsId`) REFERENCES `GuildStats`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PlayerStats_createdAt_playerId_guildStatsId_key` ON `PlayerStats` (`createdAt`,`playerId`,`guildStatsId`);