import { uz } from "@/lib/i18n/uz";
import { formatDate, formatDateTime, formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import type { getSale } from "@/lib/services/sales";
import { cn } from "@/lib/utils";

type Sale = NonNullable<Awaited<ReturnType<typeof getSale>>>;

const methodLabel = uz.paymentMethods;

/** 80 mm termoprinter cheki. Usta va bonus chekda KO'RSATILMAYDI. */
export function Receipt({ sale, className }: { sale: Sale; className?: string }) {
  const dueDate = sale.ledgerEntries.find((e) => e.dueDate)?.dueDate ?? null;
  return (
    <article
      className={cn(
        "w-[80mm] rounded-2xl border bg-card p-4 font-mono text-xs leading-relaxed shadow-card print:w-full print:rounded-none print:border-0 print:p-0 print:shadow-none",
        className,
      )}
      data-testid="receipt"
    >
      <header className="mb-2 text-center">
        <div className="text-sm font-bold">{sale.tenant.name}</div>
        {sale.tenant.address && <div>{sale.tenant.address}</div>}
        {sale.tenant.phone && <div>{sale.tenant.phone}</div>}
      </header>

      <div className="border-y border-dashed py-1">
        <div className="flex justify-between">
          <span>{uz.receipt.number}</span>
          <span>{sale.number}</span>
        </div>
        <div className="flex justify-between">
          <span>{uz.receipt.date}</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>{uz.receipt.cashier}</span>
          <span>{sale.cashier.name}</span>
        </div>
        {sale.estimate && (
          <div className="flex justify-between">
            <span>{uz.estimates.number}</span>
            <span>{sale.estimate.number}</span>
          </div>
        )}
        {sale.customer && (
          <div className="flex justify-between gap-2">
            <span>{uz.customers.customer}</span>
            <span className="text-right">
              {sale.customer.name}
              {sale.customer.phone && <span className="block">{sale.customer.phone}</span>}
            </span>
          </div>
        )}
      </div>

      <ul className="border-b border-dashed py-1">
        {sale.items.map((item) => (
          <li key={item.id} className="py-0.5">
            <div>{item.name}</div>
            <div className="flex justify-between">
              <span>
                {formatQuantity(item.quantity)} {uz.units[item.unit]} × {formatSum(item.price)}
              </span>
              <span>{formatSum(item.total)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="py-1">
        {sale.discount > 0 && (
          <>
            <div className="flex justify-between">
              <span>{uz.pos.subtotal}</span>
              <span>{formatSum(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>{uz.pos.discount}</span>
              <span>-{formatSum(sale.discount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>{uz.pos.total}</span>
          <span>{formatSum(sale.total)}</span>
        </div>
      </div>

      <div className="border-t border-dashed py-1">
        {sale.payments.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>{methodLabel[p.method]}</span>
            <span>{formatSum(p.method === "CASH" ? sale.cashReceived : p.amount)}</span>
          </div>
        ))}
        {sale.change > 0 && (
          <div className="flex justify-between">
            <span>{uz.pos.change}</span>
            <span>{formatSum(sale.change)}</span>
          </div>
        )}
        {dueDate && (
          <div className="flex justify-between">
            <span>{uz.customers.dueDate}</span>
            <span>{formatDate(dueDate)}</span>
          </div>
        )}
      </div>

      <footer className="mt-2 text-center">{uz.receipt.thanks}</footer>
    </article>
  );
}
