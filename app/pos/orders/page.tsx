import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { listOrdersWithCustomer, OPEN_STATUSES } from "@/lib/services/orders";

type SearchParams = Promise<{ all?: string }>;

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { all } = await searchParams;
  const showAll = all === "1";
  const user = await requireUser();
  const orders = await listOrdersWithCustomer(user.tenantId, showAll ? "all" : "open");

  return (
    <main className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{uz.orders.title}</h1>
          <p className="text-sm text-muted-foreground">{uz.orders.hint}</p>
        </div>
        <Link
          href={showAll ? "/pos/orders" : "/pos/orders?all=1"}
          className={buttonVariants({ variant: "outline" })}
        >
          {showAll ? uz.orders.title : uz.orders.showAll}
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">{uz.orders.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.orders.number}</TableHead>
                <TableHead>{uz.receipt.date}</TableHead>
                <TableHead>{uz.orders.customer}</TableHead>
                <TableHead>{uz.orders.status}</TableHead>
                <TableHead className="text-right">{uz.orders.total}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} data-testid="order-row">
                  <TableCell>
                    <Link href={`/pos/orders/${o.id}`} className="font-medium hover:underline">
                      {o.number}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {o.submittedAt ? formatDateTime(o.submittedAt) : "—"}
                  </TableCell>
                  <TableCell>
                    {o.customer.name}
                    {o.customer.phone && (
                      <span className="ml-2 text-muted-foreground">{o.customer.phone}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.status === "NEW" ? "default" : "secondary"}>
                      {uz.orders.statuses[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatSum(o.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    {OPEN_STATUSES.includes(o.status) && (
                      <Link
                        href={`/pos?order=${o.id}`}
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        {uz.orders.loadToPos}
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
