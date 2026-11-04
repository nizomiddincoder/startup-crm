-- CreateEnum
CREATE TYPE "StockDocumentType" AS ENUM ('RECEIPT', 'WRITE_OFF', 'INVENTORY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementType" ADD VALUE 'RECEIPT';
ALTER TYPE "MovementType" ADD VALUE 'WRITE_OFF';
ALTER TYPE "MovementType" ADD VALUE 'ADJUSTMENT';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "minStock" DECIMAL(14,3);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "documentItemId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "lastStockDocNumber" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StockDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "StockDocumentType" NOT NULL,
    "number" INTEGER NOT NULL,
    "supplierName" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDocumentItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "expected" DECIMAL(14,3),
    "costPrice" INTEGER,

    CONSTRAINT "StockDocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockDocument_tenantId_type_createdAt_idx" ON "StockDocument"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockDocument_tenantId_number_key" ON "StockDocument"("tenantId", "number");

-- CreateIndex
CREATE INDEX "StockDocumentItem_tenantId_documentId_idx" ON "StockDocumentItem"("tenantId", "documentId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_documentItemId_fkey" FOREIGN KEY ("documentItemId") REFERENCES "StockDocumentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocumentItem" ADD CONSTRAINT "StockDocumentItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocumentItem" ADD CONSTRAINT "StockDocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StockDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocumentItem" ADD CONSTRAINT "StockDocumentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
