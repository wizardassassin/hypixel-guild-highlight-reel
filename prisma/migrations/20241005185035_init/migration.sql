-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayerStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerStats" BLOB NOT NULL,
    "experience" INTEGER NOT NULL,
    "questParticipation" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "guildStatsId" TEXT NOT NULL,
    CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerStats_guildStatsId_fkey" FOREIGN KEY ("guildStatsId") REFERENCES "GuildStats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlayerStats" ("createdAt", "experience", "guildStatsId", "id", "playerId", "playerStats", "questParticipation") SELECT "createdAt", "experience", "guildStatsId", "id", "playerId", "playerStats", "questParticipation" FROM "PlayerStats";
DROP TABLE "PlayerStats";
ALTER TABLE "new_PlayerStats" RENAME TO "PlayerStats";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
