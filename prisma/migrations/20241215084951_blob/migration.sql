-- CreateTable
CREATE TABLE "BlobStorage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "blob" BLOB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BlobStorage_name_key" ON "BlobStorage"("name");
