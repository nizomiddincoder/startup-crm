/** Kunlik hisobot va nasiya xulosasi uchun ma'lumot yig'ish (har so'rov tenantId bo'yicha). */
import { db } from "@/lib/db";
import { getOpenDebts } from "../customers";
import { debtStatus } from "../debt-schedule";
import { tashkentDayRange } from "../sales";
import { listStock } from "../stock";
import type { DailyReportData, DigestRow } from "./messages";

const LOW_STOCK_SHOWN = 5;

export async function buildDailyReport(tenantId: string, now: Date): Promise<DailyReportData> {
  const { from, to } = tashkentDayRange(now);
  const today = { gte: from, lt: to };

  const [tenant, sales, payments, ledger, open, stock, returns] = await Promise.all([
    db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } }),
    db.sale.aggregate({
      where: { tenantId, createdAt: today },
      _count: true,
      _sum: { total: true, discount: true },
    }),
    db.salePayment.groupBy({
      by: ["method"],
      where: { tenantId, sale: { createdAt: today } },
      _sum: { amount: true },
    }),
    db.ledgerEntry.groupBy({
      by: ["account", "type", "method"],
      where: { tenantId, createdAt: today },
      _sum: { amount: true },
    }),
    getOpenDebts(tenantId),
    listStock(tenantId, { lowOnly: true }),
    db.saleReturn.groupBy({
      by: ["refundMethod"],
      where: { tenantId, createdAt: today },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  // Qaytarilgan pul o'z to'lov turidan ayiriladi (nasiyadan ayirilgani — nasiyadan)
  const byMethod = { CASH: 0, CARD: 0, TRANSFER: 0, DEBT: 0, POINTS: 0 };
  for (const p of payments) byMethod[p.method] = p._sum.amount ?? 0;
  for (const r of returns) byMethod[r.refundMethod] -= r._sum.total ?? 0;
  const returnsTotal = returns.reduce((s, r) => s + (r._sum.total ?? 0), 0);
  const returnsCount = returns.reduce((s, r) => s + r._count, 0);

  // Qarzdan undirilgan pul: haqiqiy to'lovlar (bonusni qarzdan ayirish — pul emas, hisobga olinmaydi)
  const debtCollected = -ledger
    .filter((l) => l.account === "DEBT" && l.type === "PAYMENT" && l.method !== "DEBT")
    .reduce((s, l) => s + (l._sum.amount ?? 0), 0);
  const bonusAccrued = ledger
    .filter((l) => l.account === "BONUS" && l.type === "ACCRUAL")
    .reduce((s, l) => s + (l._sum.amount ?? 0), 0);

  let totalDebt = 0;
  let overdueAmount = 0;
  let overdueCustomers = 0;
  for (const debts of open.values()) {
    const s = debtStatus(debts, now);
    totalDebt += s.total;
    if (s.overdue > 0) {
      overdueAmount += s.overdue;
      overdueCustomers += 1;
    }
  }

  return {
    shop: tenant.name,
    date: now,
    salesCount: sales._count,
    revenue: (sales._sum.total ?? 0) - returnsTotal,
    returnsTotal,
    returnsCount,
    discount: sales._sum.discount ?? 0,
    byMethod,
    debtCollected,
    bonusAccrued,
    totalDebt,
    overdueAmount,
    overdueCustomers,
    lowStock: stock.items
      .slice(0, LOW_STOCK_SHOWN)
      .map((p) => ({ name: p.name, balance: p.balance, unit: p.unit })),
    lowStockCount: stock.items.length,
  };
}

/** Ertalabki xulosa: muddati o'tgan va bugun keladigan nasiyalar (summasi bo'yicha kamayish tartibida). */
export async function buildMorningDigest(tenantId: string, now: Date) {
  const open = await getOpenDebts(tenantId);
  const customers = await db.customer.findMany({
    where: { tenantId, id: { in: [...open.keys()] } },
    select: { id: true, name: true, phone: true },
  });
  const byId = new Map(customers.map((c) => [c.id, c]));

  const overdue: DigestRow[] = [];
  const dueToday: DigestRow[] = [];
  for (const [id, debts] of open) {
    const c = byId.get(id);
    if (!c) continue;
    const s = debtStatus(debts, now);
    if (s.overdue > 0) {
      overdue.push({ name: c.name, phone: c.phone, amount: s.overdue, date: s.oldestOverdue });
    }
    if (s.dueToday > 0)
      dueToday.push({ name: c.name, phone: c.phone, amount: s.dueToday, date: null });
  }
  const byAmount = (a: DigestRow, b: DigestRow) => b.amount - a.amount;
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { name: true },
  });
  return { shop: tenant.name, overdue: overdue.sort(byAmount), dueToday: dueToday.sort(byAmount) };
}
