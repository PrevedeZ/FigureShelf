-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Figure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "characterBase" TEXT,
    "variant" TEXT,
    "line" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "releaseType" TEXT,
    "bodyVersion" TEXT,
    "saga" TEXT,
    "msrpCents" INTEGER NOT NULL,
    "msrpCurrency" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    CONSTRAINT "Figure_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Series_name_key" ON "Series"("name");

-- CreateIndex
CREATE INDEX "Figure_seriesId_idx" ON "Figure"("seriesId");

-- CreateIndex
CREATE INDEX "Figure_characterBase_idx" ON "Figure"("characterBase");

-- CreateIndex
CREATE INDEX "Figure_variant_idx" ON "Figure"("variant");

-- CreateIndex
CREATE INDEX "Figure_seriesId_characterBase_idx" ON "Figure"("seriesId", "characterBase");
