import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/features/pos/print-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { formatDateTime, formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { getDocument } from "@/lib/services/stock";

export default async function StockDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const doc = await getDocument(user.tenantId, id);
  if (!doc) notFound();

  const isReceipt = doc.type === "RECEIPT";
  const isInventory = doc.type === "INVENTORY";
  const receiptTotal = isReceipt
    ? doc.items.reduce(
        (sum, i) =>
          sum +
          (i.costPrice === null
            ? 0
            : new Decimal(i.quantity.toString())
                .mul(i.costPrice)
                .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
                .toNumber()),
        0,
      )
    : 0;

  return (
    <main className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {uz.warehouse.documentNumber} {doc.number}
          </h1>
          <Badge variant="secondary">{uz.warehouse.types[doc.type]}</Badge>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div>
          <span className="text-muted-foreground">{uz.receipt.date}: </span>
          {formatDateTime(doc.createdAt)}
        </div>
        <div>
          <span className="text-muted-foreground">{uz.warehouse.by}: </span>
          {doc.createdBy.name}
        </div>
        {doc.supplierName && (
          <div>
            <span className="text-muted-foreground">{uz.warehouse.supplier}: </span>
            {doc.supplierName}
          </div>
        )}
        {doc.note && (
          <div>
            <span className="text-muted-foreground">
              {doc.type === "WRITE_OFF" ? uz.warehouse.reason : uz.warehouse.note}:{" "}
            </span>
            {doc.note}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{uz.pos.product}</TableHead>
              {isInventory && <TableHead className="text-right">{uz.warehouse.expected}</TableHead>}
              <TableHead className="text-right">
                {isInventory ? uz.warehouse.counted : uz.pos.quantity}
              </TableHead>
              {isInventory && (
                <TableHead className="text-right">{uz.warehouse.difference}</TableHead>
              )}
              {isReceipt && (
                <TableHead className="text-right">{uz.warehouse.costPerUnit}</TableHead>
              )}
              {isReceipt && <TableHead className="text-right">{uz.pos.sum}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.items.map((item) => {
              const qty = new Decimal(item.quantity.toString());
              const diff = item.expected ? qty.minus(item.expected.toString()) : null;
              const unit = uz.units[item.product.unit];
              return (
                <TableRow key={item.id} data-testid="doc-line">
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/warehouse/products/${item.product.id}`}
                      className="hover:underline"
                    >
                      {item.product.name}
                    </Link>
                  </TableCell>
                  {isInventory && (
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatQuantity(item.expected ?? "0")} {unit}
                    </TableCell>
                  )}
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {formatQuantity(item.quantity)} {unit}
                  </TableCell>
                  {isInventory && (
                    <TableCell
                      className={
                        diff && !diff.isZero()
                          ? "text-right font-medium text-destructive tabular-nums"
                          : "text-right text-muted-foreground tabular-nums"
                      }
                    >
                      {diff ? `${diff.gt(0) ? "+" : ""}${formatQuantity(diff.toString())}` : "—"}
                    </TableCell>
                  )}
                  {isReceipt && (
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {item.costPrice === null ? "—" : formatSum(item.costPrice)}
                    </TableCell>
                  )}
                  {isReceipt && (
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {item.costPrice === null
                        ? "—"
                        : formatSum(
                            qty
                              .mul(item.costPrice)
                              .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
                              .toNumber(),
                          )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {isReceipt && receiptTotal > 0 && (
        <p className="text-right text-lg font-semibold tabular-nums">
          {uz.pos.subtotal}: {formatSum(receiptTotal)}
        </p>
      )}
    </main>
  );
}
