-- Product multi-plan support: ProductPlan model + order snapshots on OrderItem

CREATE TABLE "ProductPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "promoPrice" REAL,
    "durationValue" INTEGER,
    "durationUnit" TEXT NOT NULL DEFAULT 'MONTH',
    "fulfillmentInstructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductPlan_productId_isActive_sortOrder_idx" ON "ProductPlan"("productId", "isActive", "sortOrder");

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "plansEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "planId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "planTitle" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "planDurationValue" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "planDurationUnit" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "planFulfillmentInstructions" TEXT;

CREATE INDEX "OrderItem_planId_idx" ON "OrderItem"("planId");

PRAGMA foreign_keys=off;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "planId" TEXT,
    "productSlug" TEXT,
    "productName" TEXT NOT NULL,
    "planTitle" TEXT,
    "planDurationValue" INTEGER,
    "planDurationUnit" TEXT,
    "planFulfillmentInstructions" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "listUnitPrice" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL,
    "lineTotal" REAL NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ProductPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "orderId", "productId", "productSlug", "productName", "quantity", "listUnitPrice", "unitPrice", "lineTotal")
SELECT "id", "orderId", "productId", "productSlug", "productName", "quantity", "listUnitPrice", "unitPrice", "lineTotal" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
PRAGMA foreign_keys=on;