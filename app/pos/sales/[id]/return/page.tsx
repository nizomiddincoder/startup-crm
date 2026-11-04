import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/features/layout/page-header";
import { ReturnForm } from "@/components/features/pos/return-form";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { SECTION_ACCESS } from "@/lib/services/permissions";
import { getReturnable } from "@/lib/services/returns";

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(SECTION_ACCESS["/pos"]);
  const sale = await getReturnable(user.tenantId, id);
  if (!sale) notFound();
  const nothingLeft = sale.returnedTotal >= sale.total;

  return (
    <main className="flex flex-col gap-5 p-4 md:p-6">
      <PageHeader
        title={`${uz.returns.title} · ${uz.receipt.number} ${sale.number}`}
        actions={
          <Link href={`/pos/sales/${sale.id}`} className={buttonVariants({ variant: "outline" })}>
            {uz.common.back}
          </Link>
        }
      />
      {nothingLeft ? (
        <p className="text-muted-foreground">{uz.returns.nothingLeft}</p>
      ) : (
        <div className="max-w-4xl">
          <ReturnForm
            sale={{
              id: sale.id,
              subtotal: sale.subtotal,
              total: sale.total,
              returnedTotal: sale.returnedTotal,
              pointsPaid: sale.pointsPaid,
              hasCustomer: !!sale.customer,
              hadDebt: sale.hadDebt,
            }}
            items={sale.items}
          />
        </div>
      )}
    </main>
  );
}
