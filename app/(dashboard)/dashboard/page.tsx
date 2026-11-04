import { AlertTriangle, BookOpen, PackageX, Wallet } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/features/dashboard/stat-card";
import { PageHeader } from "@/components/features/layout/page-header";
import { UnitIcon } from "@/components/features/pos/unit-icon";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { t, uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { canAccessPath, canReceiveReports } from "@/lib/services/permissions";
import { buildDailyReport } from "@/lib/services/telegram/reports";

// Bosh sahifa: bugungi ko'rsatkichlar (Telegram kunlik hisoboti bilan bir xil ma'lumot).
export default async function DashboardPage() {
  const user = await requireUser();
  const report = await buildDailyReport(user.tenantId, new Date());
  const showMoney = canReceiveReports(user.role);
  // Kartochka bosilsa — raqam qayerdan kelgani (shu rol kira oladigan ro'yxat bo'lsa)
  const posLink = (href: string) => (canAccessPath(user.role, "/pos") ? href : undefined);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={`${uz.dashboard.welcome}, ${user.name.replace(/\s*\(.*\)$/, "")}`}
        description={`${user.tenantName} · ${uz.roles[user.role]}`}
        actions={
          canAccessPath(user.role, "/pos") ? (
            <Link href="/pos" className={buttonVariants({ size: "lg" })}>
              {uz.home.goToPos}
            </Link>
          ) : (
            <Link
              href="/dashboard/warehouse/new/receipt"
              className={buttonVariants({ size: "lg" })}
            >
              {uz.warehouse.receipt}
            </Link>
          )
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showMoney && (
          <>
            <StatCard
              icon={Wallet}
              label={uz.receipt.totalToday}
              value={formatSum(report.revenue)}
              hint={`${report.salesCount} ${uz.receipt.count}`}
              testId="stat-revenue"
              href={posLink("/pos/sales")}
            />
            <StatCard
              icon={BookOpen}
              label={uz.customers.totalDebt}
              value={formatSum(report.totalDebt)}
              href={posLink("/pos/customers?debtors=1")}
              testId="stat-debt"
              hint={
                report.debtCollected > 0
                  ? t(uz.dashboard.collectedToday, { amount: formatSum(report.debtCollected) })
                  : undefined
              }
            />
            <StatCard
              icon={AlertTriangle}
              tone={report.overdueAmount > 0 ? "danger" : "default"}
              label={uz.customers.overdue}
              value={formatSum(report.overdueAmount)}
              href={posLink("/pos/customers?overdue=1")}
              testId="stat-overdue"
              hint={
                report.overdueCustomers
                  ? t(uz.dashboard.customersCount, { count: report.overdueCustomers })
                  : undefined
              }
            />
          </>
        )}
        <StatCard
          icon={PackageX}
          tone={report.lowStockCount > 0 ? "warning" : "default"}
          label={uz.warehouse.low}
          value={String(report.lowStockCount)}
          hint={uz.dashboard.productsCount}
          href="/dashboard/warehouse?low=1"
          testId="stat-low"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {showMoney && (
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-bold">{uz.dashboard.paymentsToday}</h2>
            {(["CASH", "CARD", "TRANSFER", "DEBT"] as const).map((m) => {
              const amount = report.byMethod[m];
              const share = report.revenue ? Math.round((amount / report.revenue) * 100) : 0;
              return (
                <div key={m} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{uz.paymentMethods[m]}</span>
                    <span className="font-semibold tabular-nums">{formatSum(amount)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={m === "DEBT" ? "h-full bg-destructive" : "h-full bg-primary"}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{uz.warehouse.low}</h2>
            <Link
              href="/dashboard/warehouse?low=1"
              className="text-sm font-semibold text-primary hover:underline"
            >
              {uz.dashboard.viewAll}
            </Link>
          </div>
          {report.lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">{uz.dashboard.stockOk}</p>
          ) : (
            report.lowStock.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <UnitIcon unit={p.unit} className="size-10" iconClassName="size-5" />
                <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                <span className="text-sm font-semibold text-destructive tabular-nums">
                  {formatQuantity(p.balance)} {uz.units[p.unit]}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
