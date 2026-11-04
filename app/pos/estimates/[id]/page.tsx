import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelEstimateButton } from "@/components/features/pos/cancel-estimate-button";
import { PrintButton } from "@/components/features/pos/print-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { getEstimate } from "@/lib/services/estimates";
import { formatDateTime, formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const estimate = await getEstimate(user.tenantId, id);
  if (!estimate) notFound();
  const open = estimate.status === "OPEN";

  return (
    <main className="flex flex-col gap-6 p-6 print:p-0">
      <style>{`@media print { @page { size: A4; margin: 15mm; } }`}</style>

      <div className="flex flex-wrap gap-3 print:hidden">
        <PrintButton autoFocus />
        {open && (
          <Link
            href={`/pos?estimate=${estimate.id}`}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            {uz.estimates.loadToPos}
          </Link>
        )}
        {open && <CancelEstimateButton id={estimate.id} />}
        {estimate.sale && (
          <Link
            href={`/pos/sales/${estimate.sale.id}`}
            className={buttonVariants({ size: "lg", variant: "ghost" })}
          >
            {uz.receipt.number} {estimate.sale.number}
          </Link>
        )}
      </div>

      <article className="flex max-w-3xl flex-col gap-4 rounded-2xl border bg-card p-6 shadow-card print:max-w-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{estimate.tenant.name}</div>
            {estimate.tenant.address && <div className="text-sm">{estimate.tenant.address}</div>}
            {estimate.tenant.phone && <div className="text-sm">{estimate.tenant.phone}</div>}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">
              {uz.estimates.number} {estimate.number}
            </h1>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(estimate.createdAt)}
            </div>
            <Badge variant={open ? "default" : "secondary"} className="mt-1 print:hidden">
              {uz.estimates.statuses[estimate.status]}
            </Badge>
          </div>
        </header>

        {(estimate.customerName || estimate.customerPhone || estimate.note) && (
          <div className="text-sm">
            {(estimate.customerName || estimate.customerPhone) && (
              <div>
                <span className="text-muted-foreground">{uz.estimates.customer}: </span>
                {[estimate.customerName, estimate.customerPhone].filter(Boolean).join(", ")}
              </div>
            )}
            {estimate.note && (
              <div>
                <span className="text-muted-foreground">{uz.estimates.note}: </span>
                {estimate.note}
              </div>
            )}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">№</TableHead>
              <TableHead>{uz.pos.product}</TableHead>
              <TableHead className="text-right">{uz.pos.quantity}</TableHead>
              <TableHead className="text-right">{uz.pos.price}</TableHead>
              <TableHead className="text-right">{uz.pos.sum}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimate.items.map((item, i) => (
              <TableRow key={item.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="whitespace-normal">{item.name}</TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {formatQuantity(item.quantity)} {uz.units[item.unit]}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {formatSum(item.price)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {formatSum(item.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            {estimate.discount > 0 && (
              <>
                <TableRow>
                  <TableCell colSpan={4} className="text-right">
                    {uz.pos.subtotal}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatSum(estimate.subtotal)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right">
                    {uz.pos.discount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    -{formatSum(estimate.discount)}
                  </TableCell>
                </TableRow>
              </>
            )}
            <TableRow>
              <TableCell colSpan={4} className="text-right font-semibold">
                {uz.pos.total}
              </TableCell>
              <TableCell
                className="text-right text-base font-semibold tabular-nums"
                data-testid="estimate-total"
              >
                {formatSum(estimate.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        <footer className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div>
            {uz.estimates.prepared}: {estimate.createdBy.name}
          </div>
          <div>{uz.estimates.disclaimer}</div>
        </footer>
      </article>
    </main>
  );
}
