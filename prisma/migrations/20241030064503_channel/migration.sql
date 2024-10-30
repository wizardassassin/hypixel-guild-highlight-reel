/*
  Warnings:

  - You are about to drop the column `channelIdDiscord` on the `Guild` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildIdDiscord" TEXT NOT NULL,
    "guildIdHypixel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAtHypixel" DATETIME NOT NULL
);
INSERT INTO "new_Guild" ("createdAtHypixel", "guildIdDiscord", "guildIdHypixel", "id", "name") SELECT "createdAtHypixel", "guildIdDiscord", "guildIdHypixel", "id", "name" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
CREATE UNIQUE INDEX "Guild_guildIdDiscord_key" ON "Guild"("guildIdDiscord");
CREATE UNIQUE INDEX "Guild_guildIdHypixel_key" ON "Guild"("guildIdHypixel");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
