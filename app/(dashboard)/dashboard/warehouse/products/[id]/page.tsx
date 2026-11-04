import Link from "next/link";
import { notFound } from "next/navigation";
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
import { canAccessPath } from "@/lib/services/permissions";
import { getProductMovements } from "@/lib/services/stock";

export default async function ProductHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getProductMovements(user.tenantId, id);
  if (!data) notFound();
  const unit = uz.units[data.product.unit];
  // Omborchi kassa bo'limiga kira olmaydi — chekka havola bermaymiz
  const canSeeReceipts = canAccessPath(user.role, "/pos");

  return (
    <main className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{data.product.name}</h1>
        <p className="text-muted-foreground">
          {uz.warehouse.stock}:{" "}
          <span className="font-medium text-foreground tabular-nums" data-testid="product-balance">
            {formatQuantity(data.balance)} {unit}
          </span>
        </p>
      </div>

      <h2 className="text-lg font-bold">{uz.warehouse.history}</h2>
      {data.movements.length === 0 ? (
        <p className="text-muted-foreground">{uz.warehouse.noMovements}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.receipt.date}</TableHead>
                <TableHead>{uz.warehouse.type}</TableHead>
                <TableHead>{uz.warehouse.source}</TableHead>
                <TableHead className="text-right">{uz.pos.quantity}</TableHead>
                <TableHead className="text-right">{uz.warehouse.balanceAfter}</TableHead>
                <TableHead>{uz.warehouse.by}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.movements.map((m) => {
                const positive = !m.quantity.startsWith("-");
                return (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{uz.warehouse.movementTypes[m.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      {m.sale ? (
                        canSeeReceipts ? (
                          <Link href={`/pos/sales/${m.sale.id}`} className="hover:underline">
                            {uz.receipt.number} {m.sale.number}
                          </Link>
                        ) : (
                          `${uz.receipt.number} ${m.sale.number}`
                        )
                      ) : m.document ? (
                        <Link
                          href={`/dashboard/warehouse/documents/${m.document.id}`}
                          className="hover:underline"
                        >
                          {uz.warehouse.documentNumber} {m.document.number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell
                      className={
                        positive
                          ? "text-right font-medium text-success tabular-nums"
                          : "text-right font-medium text-destructive tabular-nums"
                      }
                    >
                      {positive ? "+" : ""}
                      {formatQuantity(m.quantity)} {unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(m.balanceAfter)}
                    </TableCell>
                    <TableCell>{m.user}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
