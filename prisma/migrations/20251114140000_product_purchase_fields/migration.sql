-- Product-specific checkout fields (JSON schema); optional per product.
ALTER TABLE "Product" ADD COLUMN "purchaseFieldsJson" TEXT NOT NULL DEFAULT '[]';