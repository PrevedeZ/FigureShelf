/*
  Warnings:

  - Made the column `slug` on table `Figure` required. This step will fail if there are existing NULL values in that column.
  - Made the column `slug` on table `Series` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Figure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "characterBase" TEXT,
    "variant" TEXT,
    "line" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "releaseType" TEXT DEFAULT 'retail',
    "bodyVersionTag" TEXT,
    "bodyVersion" TEXT DEFAULT 'OTHER',
    "saga" TEXT,
    "msrpCents" INTEGER NOT NULL,
    "msrpCurrency" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Figure_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Figure" ("bodyVersion", "bodyVersionTag", "character", "characterBase", "createdAt", "id", "image", "line", "msrpCents", "msrpCurrency", "name", "releaseType", "releaseYear", "saga", "seriesId", "slug", "updatedAt", "variant") SELECT "bodyVersion", "bodyVersionTag", "character", "characterBase", "createdAt", "id", "image", "line", "msrpCents", "msrpCurrency", "name", "releaseType", "releaseYear", "saga", "seriesId", "slug", "updatedAt", "variant" FROM "Figure";
DROP TABLE "Figure";
ALTER TABLE "new_Figure" RENAME TO "Figure";
CREATE UNIQUE INDEX "Figure_slug_key" ON "Figure"("slug");
CREATE INDEX "Figure_seriesId_idx" ON "Figure"("seriesId");
CREATE INDEX "Figure_characterBase_idx" ON "Figure"("characterBase");
CREATE INDEX "Figure_variant_idx" ON "Figure"("variant");
CREATE INDEX "Figure_seriesId_characterBase_idx" ON "Figure"("seriesId", "characterBase");
CREATE INDEX "Figure_releaseYear_idx" ON "Figure"("releaseYear");
CREATE TABLE "new_Series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Series" ("createdAt", "id", "name", "slug") SELECT "createdAt", "id", "name", "slug" FROM "Series";
DROP TABLE "Series";
ALTER TABLE "new_Series" RENAME TO "Series";
CREATE UNIQUE INDEX "Series_name_key" ON "Series"("name");
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
