-- CreateTable
CREATE TABLE "HousingCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cookies" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "HousingCache_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerStats" BLOB NOT NULL,
    "experience" INTEGER NOT NULL,
    "questParticipation" INTEGER NOT NULL,
    "skyblockExperience" INTEGER NOT NULL,
    "housingCookies" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "guildStatsId" TEXT NOT NULL,
    CONSTRAINT "PlayerStats_guildStatsId_fkey" FOREIGN KEY ("guildStatsId") REFERENCES "GuildStats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "joined" DATETIME NOT NULL,
    "initialJoined" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GuildStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "experience" INTEGER NOT NULL,
    "experienceByGameType" BLOB NOT NULL,
    "guildId" TEXT NOT NULL,
    "rawDataHash" TEXT NOT NULL,
    CONSTRAINT "GuildStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildIdDiscord" TEXT NOT NULL,
    "channelIdDiscord" TEXT NOT NULL,
    "guildIdHypixel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAtHypixel" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "HousingCache_playerId_key" ON "HousingCache"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStats_createdAt_playerId_guildStatsId_key" ON "PlayerStats"("createdAt", "playerId", "guildStatsId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_uuid_key" ON "Player"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "GuildStats_createdAt_guildId_key" ON "GuildStats"("createdAt", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildIdDiscord_key" ON "Guild"("guildIdDiscord");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_channelIdDiscord_key" ON "Guild"("channelIdDiscord");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildIdHypixel_key" ON "Guild"("guildIdHypixel");
