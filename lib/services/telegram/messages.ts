/**
 * Telegram xabarlari matni (HTML parse_mode). Toza funksiyalar — test qilish oson.
 * Barcha matn shablonlari lib/i18n/uz.ts → bot bo'limida.
 */
import { t, uz } from "@/lib/i18n/uz";
import type { DebtStatus } from "../debt-schedule";
import { formatDate, formatQuantity } from "../format";
import { formatSum } from "../money";

/** Foydalanuvchi kiritgan matnni (ism, mahsulot nomi) HTML uchun xavfsiz qiladi. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type DailyReportData = {
  shop: string;
  date: Date;
  salesCount: number;
  revenue: number;
  discount: number;
  byMethod: { CASH: number; CARD: number; TRANSFER: number; DEBT: number; POINTS?: number };
  debtCollected: number;
  bonusAccrued: number;
  totalDebt: number;
  overdueAmount: number;
  overdueCustomers: number;
  lowStock: { name: string; balance: string; unit: keyof typeof uz.units }[];
  lowStockCount: number;
  /** Bugungi qaytarishlar (revenue — ulardan keyingi sof tushum) */
  returnsTotal?: number;
  returnsCount?: number;
};

export function formatDailyReport(d: DailyReportData): string {
  const lines = [t(uz.bot.reportTitle, { shop: escapeHtml(d.shop), date: formatDate(d.date) }), ""];

  if (d.salesCount === 0) {
    lines.push(uz.bot.noSales);
  } else {
    lines.push(t(uz.bot.salesLine, { count: d.salesCount, total: formatSum(d.revenue) }));
    if (d.discount > 0) lines.push(t(uz.bot.discountLine, { amount: formatSum(d.discount) }));
    if (d.returnsTotal) {
      lines.push(
        t(uz.bot.returnsLine, { amount: formatSum(d.returnsTotal), count: d.returnsCount ?? 0 }),
      );
    }
    lines.push(uz.bot.byMethod);
    for (const m of ["CASH", "CARD", "TRANSFER", "DEBT", "POINTS"] as const) {
      const amount = d.byMethod[m] ?? 0;
      if (amount > 0) lines.push(`  • ${uz.paymentMethods[m]}: ${formatSum(amount)}`);
    }
  }
  if (d.debtCollected > 0)
    lines.push(t(uz.bot.debtCollected, { amount: formatSum(d.debtCollected) }));
  if (d.bonusAccrued > 0) lines.push(t(uz.bot.bonusAccrued, { amount: formatSum(d.bonusAccrued) }));

  lines.push("", t(uz.bot.totalDebt, { amount: formatSum(d.totalDebt) }));
  if (d.overdueAmount > 0) {
    lines.push(
      t(uz.bot.overdueLine, { amount: formatSum(d.overdueAmount), count: d.overdueCustomers }),
    );
  }
  if (d.lowStockCount > 0) {
    lines.push("", t(uz.bot.lowStock, { count: d.lowStockCount }));
    for (const p of d.lowStock) {
      lines.push(`  • ${escapeHtml(p.name)}: ${formatQuantity(p.balance)} ${uz.units[p.unit]}`);
    }
  }
  return lines.join("\n");
}

export type DigestRow = { name: string; phone: string | null; amount: number; date: Date | null };

export const DIGEST_LIMIT = 10;

export function formatMorningDigest(
  shop: string,
  date: Date,
  overdue: DigestRow[],
  dueToday: DigestRow[],
): string {
  const lines = [t(uz.bot.digestTitle, { shop: escapeHtml(shop), date: formatDate(date) }), ""];
  if (overdue.length === 0 && dueToday.length === 0) {
    lines.push(uz.bot.digestNone);
    return lines.join("\n");
  }
  const section = (title: string, rows: DigestRow[]) => {
    if (!rows.length) return;
    lines.push(title);
    for (const r of rows.slice(0, DIGEST_LIMIT)) {
      const phone = r.phone ? ` (${r.phone})` : "";
      const due = r.date ? ` — ${formatDate(r.date)}` : "";
      lines.push(`  • ${escapeHtml(r.name)}${phone}: <b>${formatSum(r.amount)}</b>${due}`);
    }
    if (rows.length > DIGEST_LIMIT) {
      lines.push(`  ${t(uz.bot.digestMore, { count: rows.length - DIGEST_LIMIT })}`);
    }
    lines.push("");
  };
  section(uz.bot.digestOverdue, overdue);
  section(uz.bot.digestToday, dueToday);
  return lines.join("\n").trimEnd();
}

export function formatCustomerReminder(
  shop: string,
  shopPhone: string | null,
  status: DebtStatus,
): string {
  const lines = [t(uz.bot.reminderTitle, { shop: escapeHtml(shop) }), ""];
  lines.push(t(uz.bot.reminderTotal, { amount: formatSum(status.total) }));
  if (status.overdue > 0 && status.oldestOverdue) {
    lines.push(
      t(uz.bot.reminderOverdue, {
        amount: formatSum(status.overdue),
        date: formatDate(status.oldestOverdue),
      }),
    );
  }
  if (status.dueToday > 0)
    lines.push(t(uz.bot.reminderToday, { amount: formatSum(status.dueToday) }));
  if (status.dueTomorrow > 0) {
    lines.push(t(uz.bot.reminderTomorrow, { amount: formatSum(status.dueTomorrow) }));
  }
  lines.push(
    "",
    t(uz.bot.reminderFooter, { phone: shopPhone ? `: ${escapeHtml(shopPhone)}` : "" }),
  );
  return lines.join("\n");
}
