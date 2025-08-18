-- AlterTable
ALTER TABLE "Series" ADD COLUMN "slug" TEXT;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT,
    "data" JSONB,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "ccy" TEXT NOT NULL,
    "perEUR" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Figure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT,
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
INSERT INTO "new_Figure" ("bodyVersion", "character", "characterBase", "id", "image", "line", "msrpCents", "msrpCurrency", "name", "releaseType", "releaseYear", "saga", "seriesId", "variant") SELECT "bodyVersion", "character", "characterBase", "id", "image", "line", "msrpCents", "msrpCurrency", "name", "releaseType", "releaseYear", "saga", "seriesId", "variant" FROM "Figure";
DROP TABLE "Figure";
ALTER TABLE "new_Figure" RENAME TO "Figure";
CREATE INDEX "Figure_seriesId_idx" ON "Figure"("seriesId");
CREATE INDEX "Figure_characterBase_idx" ON "Figure"("characterBase");
CREATE INDEX "Figure_variant_idx" ON "Figure"("variant");
CREATE INDEX "Figure_seriesId_characterBase_idx" ON "Figure"("seriesId", "characterBase");
CREATE INDEX "Figure_releaseYear_idx" ON "Figure"("releaseYear");
CREATE TABLE "new_Owned" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "figureId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "pricePaidCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "fxPerEUR" REAL,
    "acquiredAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "condition" TEXT,
    "boxCondition" TEXT,
    "location" TEXT,
    "note" TEXT,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "soldAt" DATETIME,
    "soldPriceCents" INTEGER,
    "soldCurrency" TEXT,
    "soldNote" TEXT,
    "data" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Owned_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Owned_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Owned" ("createdAt", "currency", "figureId", "fxPerEUR", "id", "pricePaidCents", "shippingCents", "taxCents", "userId") SELECT "createdAt", "currency", "figureId", "fxPerEUR", "id", "pricePaidCents", "shippingCents", "taxCents", "userId" FROM "Owned";
DROP TABLE "Owned";
ALTER TABLE "new_Owned" RENAME TO "Owned";
CREATE INDEX "Owned_userId_idx" ON "Owned"("userId");
CREATE INDEX "Owned_figureId_idx" ON "Owned"("figureId");
CREATE INDEX "Owned_isSold_idx" ON "Owned"("isSold");
CREATE TABLE "new_Wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "figureId" TEXT NOT NULL,
    "wantAnother" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "targetPriceCents" INTEGER,
    "targetCurrency" TEXT,
    "notifyBelowTarget" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Wishlist_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Wishlist" ("createdAt", "figureId", "id", "note", "userId") SELECT "createdAt", "figureId", "id", "note", "userId" FROM "Wishlist";
DROP TABLE "Wishlist";
ALTER TABLE "new_Wishlist" RENAME TO "Wishlist";
CREATE INDEX "Wishlist_userId_idx" ON "Wishlist"("userId");
CREATE INDEX "Wishlist_figureId_idx" ON "Wishlist"("figureId");
CREATE UNIQUE INDEX "Wishlist_userId_figureId_key" ON "Wishlist"("userId", "figureId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_date_ccy_key" ON "FxRate"("date", "ccy");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
