import Link from "next/link";
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
import { formatDateTime } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { listReturnsForDay, listSalesForDay } from "@/lib/services/sales";

const methodLabel = uz.paymentMethods;

/** Bugungi sotuvlar va qaytarishlar — paneldagi "Bugungi tushum" aynan shu ro'yxatdan. */
export default async function TodaySalesPage() {
  const user = await requireUser();
  const [sales, returns] = await Promise.all([
    listSalesForDay(user.tenantId),
    listReturnsForDay(user.tenantId),
  ]);
  const salesSum = sales.reduce((sum, s) => sum + s.total, 0);
  const returnsSum = returns.reduce((sum, r) => sum + r.total, 0);

  return (
    <main className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{uz.pos.todaySales}</h1>
          <p className="text-sm text-muted-foreground">{uz.receipt.howCalculated}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-right" data-testid="sales-summary">
          <div className="rounded-xl border bg-card px-4 py-2">
            <dt className="text-xs text-muted-foreground">
              {uz.receipt.salesSum} · {sales.length}
            </dt>
            <dd className="font-semibold tabular-nums">{formatSum(salesSum)}</dd>
          </div>
          <div className="rounded-xl border bg-card px-4 py-2">
            <dt className="text-xs text-muted-foreground">
              {uz.receipt.returnsSum} · {returns.length}
            </dt>
            <dd className="font-semibold text-destructive tabular-nums">
              {returnsSum ? `−${formatSum(returnsSum)}` : formatSum(0)}
            </dd>
          </div>
          <div className="rounded-xl bg-accent px-4 py-2 text-accent-foreground">
            <dt className="text-xs">{uz.receipt.totalToday}</dt>
            <dd className="text-lg font-bold tabular-nums" data-testid="net-revenue">
              {formatSum(salesSum - returnsSum)}
            </dd>
          </div>
        </dl>
      </div>

      {sales.length === 0 ? (
        <p className="text-muted-foreground">{uz.receipt.noSales}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.receipt.number}</TableHead>
                <TableHead>{uz.receipt.date}</TableHead>
                <TableHead>{uz.receipt.cashier}</TableHead>
                <TableHead>{uz.pos.payment}</TableHead>
                <TableHead className="text-right">{uz.pos.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const returned = s.returns.reduce((sum, r) => sum + r.total, 0);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/pos/sales/${s.id}`} className="font-medium hover:underline">
                        {s.number}
                      </Link>
                      {returned > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {uz.receipt.returned}: {formatSum(returned)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell>{s.cashier.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.payments.map((p) => methodLabel[p.method]).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatSum(s.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {returns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{uz.returns.history}</h2>
          <div className="rounded-2xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{uz.returns.number}</TableHead>
                  <TableHead>{uz.receipt.number}</TableHead>
                  <TableHead>{uz.receipt.date}</TableHead>
                  <TableHead>{uz.receipt.cashier}</TableHead>
                  <TableHead>{uz.returns.refundMethod}</TableHead>
                  <TableHead className="text-right">{uz.pos.sum}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.number}</TableCell>
                    <TableCell>
                      <Link href={`/pos/sales/${r.sale.id}`} className="hover:underline">
                        {r.sale.number}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell>{r.user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.refundMethod === "DEBT"
                        ? uz.returns.refundDebt
                        : methodLabel[r.refundMethod]}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive tabular-nums">
                      −{formatSum(r.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </main>
  );
}
