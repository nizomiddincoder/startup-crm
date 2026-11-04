import { Undo2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/features/pos/print-button";
import { Receipt } from "@/components/features/pos/receipt";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { formatDateTime } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { getReturnable } from "@/lib/services/returns";
import { getSale } from "@/lib/services/sales";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [sale, returnable] = await Promise.all([
    getSale(user.tenantId, id),
    getReturnable(user.tenantId, id),
  ]);
  if (!sale || !returnable) notFound();
  const canReturn = returnable.returnedTotal < returnable.total;

  return (
    <main className="flex flex-col items-center gap-6 p-6 print:block print:p-0">
      {/* Chek printeri (80 mm) uchun sahifa o'lchami */}
      <style>{`@media print { @page { size: 80mm auto; margin: 3mm; } }`}</style>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <PrintButton />
        {canReturn && (
          <Link
            href={`/pos/sales/${sale.id}/return`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <Undo2 className="size-4" />
            {uz.returns.action}
          </Link>
        )}
        <Link href="/pos" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {uz.receipt.newSale}
        </Link>
      </div>

      <Receipt sale={sale} />

      {returnable.returns.length > 0 && (
        <section
          className="flex w-full max-w-md flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card print:hidden"
          data-testid="sale-returns"
        >
          <h2 className="font-bold">{uz.returns.history}</h2>
          {returnable.returns.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 text-sm">
              <span>
                {uz.returns.number} {r.number} · {formatDateTime(r.createdAt)} · {r.user.name}
                <span className="block text-xs text-muted-foreground">
                  {r.refundMethod === "DEBT"
                    ? uz.returns.refundDebt
                    : uz.paymentMethods[r.refundMethod]}
                  {r.reason && ` · ${r.reason}`}
                </span>
              </span>
              <span className="font-semibold text-destructive tabular-nums">
                −{formatSum(r.total)}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
