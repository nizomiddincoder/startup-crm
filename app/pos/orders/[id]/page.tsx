import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/features/layout/page-header";
import { OrderActions } from "@/components/features/orders/order-actions";
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
import { formatDateTime, formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { getOrder } from "@/lib/services/orders";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrder(user.tenantId, id);
  if (!order) notFound();
  const open = order.status === "NEW" || order.status === "ACCEPTED" || order.status === "READY";

  return (
    <main className="flex flex-col gap-5 p-4 md:p-6">
      <PageHeader
        title={`${uz.orders.number} ${order.number}`}
        actions={
          <Link href="/pos/orders" className={buttonVariants({ variant: "outline" })}>
            {uz.common.back}
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge data-testid="order-status">{uz.orders.statuses[order.status]}</Badge>
        <Link href={`/pos/customers/${order.customer.id}`} className="font-medium hover:underline">
          {order.customer.name}
        </Link>
        {order.customer.phone && (
          <span className="text-muted-foreground">{order.customer.phone}</span>
        )}
        {order.submittedAt && (
          <span className="text-muted-foreground">{formatDateTime(order.submittedAt)}</span>
        )}
        {order.sale && (
          <Link href={`/pos/sales/${order.sale.id}`} className="hover:underline">
            {uz.receipt.number} {order.sale.number}
          </Link>
        )}
      </div>

      <div className="max-w-3xl rounded-2xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{uz.pos.product}</TableHead>
              <TableHead className="text-right">{uz.pos.quantity}</TableHead>
              <TableHead className="text-right">{uz.pos.price}</TableHead>
              <TableHead className="text-right">{uz.pos.sum}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(i.quantity)} {uz.units[i.unit]}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatSum(i.price)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatSum(i.total)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-semibold">
                {uz.orders.total}
              </TableCell>
              <TableCell className="text-right text-lg font-bold tabular-nums">
                {formatSum(order.total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {order.note && (
        <p className="text-sm">
          {uz.orders.note}: {order.note}
        </p>
      )}

      {open && <OrderActions id={order.id} status={order.status as "NEW" | "ACCEPTED" | "READY"} />}
    </main>
  );
}
