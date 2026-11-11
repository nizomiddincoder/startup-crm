import { uz } from "@/lib/i18n/uz";
import { formatDateTime, formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import type { getOrder } from "@/lib/services/orders";
import { cn } from "@/lib/utils";

type Order = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

/**
 * Buyurtma cheki (80 mm). Kassir buyurtmani qabul qilgach yoki mijoz kelganda chop etadi.
 * Sotuv cheki (components/features/pos/receipt.tsx) — to'lov bo'lgandan keyin; bu — buyurtma tarkibi.
 */
export function OrderReceipt({
  order,
  shopName,
  className,
}: {
  order: Order;
  shopName: string;
  className?: string;
}) {
  const t = uz.orderReceipt;
  return (
    <article
      className={cn(
        "w-[80mm] rounded-2xl border bg-card p-4 font-mono text-xs leading-relaxed shadow-card print:w-full print:rounded-none print:border-0 print:p-0 print:shadow-none",
        className,
      )}
      data-testid="order-receipt"
    >
      <header className="mb-2 text-center">
        <div className="text-sm font-bold">{shopName}</div>
        <div className="font-bold">
          {t.title}
        </div>
      </header>

      <div className="border-y border-dashed py-1">
        <div className="flex justify-between">
          <span>{t.number}</span>
          <span>{order.number ?? "—"}</span>
        </div>
        {order.submittedAt && (
          <div className="flex justify-between">
            <span>{t.date}</span>
            <span>{formatDateTime(order.submittedAt)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span>{t.customer}</span>
          <span className="text-right">
            {order.customer.name}
            {order.customer.phone && <span className="block">{order.customer.phone}</span>}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t.status}</span>
          <span>{uz.orders.statuses[order.status]}</span>
        </div>
      </div>

      <ul className="border-b border-dashed py-1">
        {order.items.map((item) => (
          <li key={item.id} className="py-0.5">
            <div>{item.name}</div>
            <div className="flex justify-between">
              <span>
                {formatQuantity(item.quantity)} {uz.units[item.unit]} × {formatSum(item.price)}
              </span>
              <span>{formatSum(item.price * Number(item.quantity))}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-between py-1 text-sm font-bold">
        <span>{t.total}</span>
        <span>{formatSum(order.total)}</span>
      </div>

      {order.note && <p className="border-t border-dashed py-1">{order.note}</p>}

      <footer className="mt-2 text-center">{t.thanks}</footer>
    </article>
  );
}
