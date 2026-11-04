-- DropForeignKey
ALTER TABLE "SaleReturnItem" DROP CONSTRAINT "SaleReturnItem_saleItemId_fkey";

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
