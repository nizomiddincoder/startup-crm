import { redirect } from "next/navigation";
import { PageHeader } from "@/components/features/layout/page-header";
import { CashbackForm, PromotionForm } from "@/components/features/marketing/marketing-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/lib/services/format";
import { canManageCustomers } from "@/lib/services/permissions";
import {
  getCashbackPercent,
  listPromotions,
  promotionOptions,
  promotionState,
} from "@/lib/services/promotions";
import { setPromotionActiveAction } from "./actions";

/** "2026-10-25" — Toshkent sanasi (forma uchun). */
function tashkentToday(now = new Date()) {
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Marketing: bonus ballari (keshbek) va muddatli aksiyalar. Egasi va menejer. */
export default async function MarketingPage() {
  const user = await requireUser();
  if (!canManageCustomers(user.role)) redirect("/dashboard");
  const [cashback, promotions, options] = await Promise.all([
    getCashbackPercent(user.tenantId),
    listPromotions(user.tenantId),
    promotionOptions(user.tenantId),
  ]);
  const now = new Date();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title={uz.promotions.title} />

      <section className="flex max-w-3xl flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="text-lg font-bold">{uz.promotions.cashbackTitle}</h2>
        <p className="text-sm text-muted-foreground">{uz.promotions.cashbackHint}</p>
        <CashbackForm value={cashback} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{uz.promotions.promoTitle}</h2>
        <p className="text-sm text-muted-foreground">{uz.promotions.promoHint}</p>
        <PromotionForm
          products={options.products}
          categories={options.categories}
          today={tashkentToday(now)}
        />

        {promotions.length === 0 ? (
          <p className="text-muted-foreground">{uz.promotions.empty}</p>
        ) : (
          <div className="rounded-2xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{uz.promotions.name}</TableHead>
                  <TableHead>{uz.promotions.target}</TableHead>
                  <TableHead className="text-right">{uz.promotions.percent}</TableHead>
                  <TableHead>
                    {uz.promotions.startsOn} — {uz.promotions.endsOn}
                  </TableHead>
                  <TableHead>{uz.promotions.status}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((p) => {
                  const state = promotionState(p, now);
                  return (
                    <TableRow key={p.id} data-testid="promo-row">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.product?.name ?? p.category?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.percent.toString().replace(".", ",")}%
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDate(p.startsAt)} — {formatDate(p.endsAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={state === "active" ? "default" : "secondary"}>
                          {uz.promotions[state]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {state !== "ended" && (
                          <form action={setPromotionActiveAction.bind(null, p.id, !p.isActive)}>
                            <Button type="submit" size="sm" variant="outline">
                              {p.isActive ? uz.promotions.turnOff : uz.promotions.turnOn}
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
