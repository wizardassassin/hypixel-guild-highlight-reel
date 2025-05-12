/*
  Warnings:

  - Made the column `color` on table `Player` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "joined" DATETIME NOT NULL,
    "initialJoined" DATETIME NOT NULL
);
INSERT INTO "new_Player" ("color", "id", "initialJoined", "joined", "prefix", "username", "uuid") SELECT "color", "id", "initialJoined", "joined", "prefix", "username", "uuid" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_uuid_key" ON "Player"("uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
