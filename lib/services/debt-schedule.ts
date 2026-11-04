/**
 * Nasiya jadvali: to'lovlar eng eski qarzlarga birinchi yoziladi (FIFO).
 * Shu orqali qaysi qarz qancha qolgani va muddati o'tganmi — aniq bilinadi.
 * Toza funksiyalar (bazaga murojaat yo'q) — bot, hisobot va mijoz sahifasi ishlatadi.
 */
import { dayKey } from "./format";

export type DebtLedgerRow = {
  type: "SALE" | "PAYMENT";
  /** SALE — musbat, PAYMENT — manfiy (LedgerEntry.amount kabi) */
  amount: number;
  dueDate: Date | null;
  createdAt: Date;
  saleId: string | null;
};

export type OpenDebt = {
  saleId: string | null;
  createdAt: Date;
  dueDate: Date | null;
  outstanding: number;
};

export function allocateDebt(rows: DebtLedgerRow[]): OpenDebt[] {
  const sales = rows
    .filter((r) => r.type === "SALE" && r.amount > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((r) => ({
      saleId: r.saleId,
      createdAt: r.createdAt,
      dueDate: r.dueDate,
      outstanding: r.amount,
    }));

  let paid = rows.filter((r) => r.type === "PAYMENT").reduce((s, r) => s - r.amount, 0);
  for (const sale of sales) {
    if (paid <= 0) break;
    const applied = Math.min(paid, sale.outstanding);
    sale.outstanding -= applied;
    paid -= applied;
  }
  return sales.filter((s) => s.outstanding > 0);
}

export type DebtStatus = {
  total: number;
  /** Muddati o'tgan (bugundan oldin) qism */
  overdue: number;
  /** Muddati aynan bugun */
  dueToday: number;
  /** Muddati ertaga */
  dueTomorrow: number;
  /** Eng yaqin kelajakdagi (bugun yoki keyin) muddat */
  nextDue: Date | null;
  /** Eng eski o'tgan muddat */
  oldestOverdue: Date | null;
};

export function debtStatus(open: OpenDebt[], now: Date): DebtStatus {
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const status: DebtStatus = {
    total: 0,
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0,
    nextDue: null,
    oldestOverdue: null,
  };
  for (const d of open) {
    status.total += d.outstanding;
    if (!d.dueDate) continue;
    const key = dayKey(d.dueDate);
    if (key < today) {
      status.overdue += d.outstanding;
      if (!status.oldestOverdue || d.dueDate < status.oldestOverdue)
        status.oldestOverdue = d.dueDate;
    } else {
      if (key === today) status.dueToday += d.outstanding;
      if (key === tomorrow) status.dueTomorrow += d.outstanding;
      if (!status.nextDue || d.dueDate < status.nextDue) status.nextDue = d.dueDate;
    }
  }
  return status;
}

/** Muddati o'tgan qarz haqida necha kunda bir eslatiladi. */
export const OVERDUE_REMINDER_EVERY_DAYS = 3;

/**
 * Mijozga eslatma yuborish kerakmi:
 * — muddati ertaga yoki bugun bo'lsa: kuniga bir marta;
 * — muddati o'tgan bo'lsa: har 3 kunda bir marta;
 * — muddatsiz nasiya uchun eslatma yuborilmaydi (egasi o'zi hal qiladi).
 */
export function shouldRemind(status: DebtStatus, lastSentAt: Date | null, now: Date): boolean {
  if (status.total <= 0) return false;
  const sentToday = lastSentAt !== null && dayKey(lastSentAt) === dayKey(now);
  if (sentToday) return false;
  if (status.dueToday > 0 || status.dueTomorrow > 0) return true;
  if (status.overdue > 0) {
    if (!lastSentAt) return true;
    const days = (now.getTime() - lastSentAt.getTime()) / (24 * 60 * 60 * 1000);
    return days >= OVERDUE_REMINDER_EVERY_DAYS - 0.01;
  }
  return false;
}
