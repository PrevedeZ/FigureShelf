-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Owned" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "figureId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "pricePaidCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "fxPerEUR" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Owned_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Owned_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Owned" ("createdAt", "currency", "figureId", "fxPerEUR", "id", "pricePaidCents", "shippingCents", "taxCents", "userId") SELECT "createdAt", "currency", "figureId", "fxPerEUR", "id", "pricePaidCents", coalesce("shippingCents", 0) AS "shippingCents", coalesce("taxCents", 0) AS "taxCents", "userId" FROM "Owned";
DROP TABLE "Owned";
ALTER TABLE "new_Owned" RENAME TO "Owned";
CREATE INDEX "Owned_userId_idx" ON "Owned"("userId");
CREATE INDEX "Owned_figureId_idx" ON "Owned"("figureId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
