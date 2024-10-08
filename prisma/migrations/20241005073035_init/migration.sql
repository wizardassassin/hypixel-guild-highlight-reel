-- CreateTable
CREATE TABLE "PlayerStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerStats" BLOB NOT NULL,
    "experience" INTEGER NOT NULL,
    "questParticipation" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "guildStatsId" TEXT NOT NULL,
    CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerStats_guildStatsId_fkey" FOREIGN KEY ("guildStatsId") REFERENCES "GuildStats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "joined" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GuildStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "experience" INTEGER NOT NULL,
    "experienceByGameType" BLOB NOT NULL,
    "guildId" TEXT NOT NULL,
    CONSTRAINT "GuildStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildIdDiscord" TEXT NOT NULL,
    "guildIdHypixel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAtHypixel" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_uuid_key" ON "Player"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildIdDiscord_key" ON "Guild"("guildIdDiscord");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildIdHypixel_key" ON "Guild"("guildIdHypixel");
