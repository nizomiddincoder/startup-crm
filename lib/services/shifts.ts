import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { shiftCashSchema, type ShiftCashInput } from "@/lib/validation/sale";
import { ServiceError } from "./errors";
import { expectedShiftCash } from "./sale-math";

/**
 * Kassa smenasi. Har kassirda bir vaqtda bitta ochiq smena. Kutilgan naqd smena davomida shu
 * kassir qilgan naqd amallardan hisoblanadi (sotuv, qarz to'lovi, bonus berish, qaytarish).
 */
export async function getOpenShift(tenantId: string, userId: string) {
  return db.cashShift.findFirst({
    where: { tenantId, userId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });
}

export async function openShift(tenantId: string, userId: string, input: ShiftCashInput) {
  const data = shiftCashSchema.parse(input);
  return db.$transaction(async (tx) => {
    const open = await tx.cashShift.findFirst({ where: { tenantId, userId, closedAt: null } });
    if (open) throw new ServiceError(uz.shifts.alreadyOpen);
    const { lastShiftNumber } = await tx.tenant.update({
      where: { id: tenantId },
      data: { lastShiftNumber: { increment: 1 } },
      select: { lastShiftNumber: true },
    });
    return tx.cashShift.create({
      data: {
        tenantId,
        userId,
        number: lastShiftNumber,
        openingCash: data.cash,
        note: data.note,
      },
    });
  });
}

/** Smena davomidagi naqd amallar (kassir bo'yicha, [from, to) oralig'ida). */
export async function shiftCashParts(tenantId: string, userId: string, from: Date, to: Date) {
  const range = { gte: from, lt: to };
  const [sales, ledger, refunds] = await Promise.all([
    db.salePayment.aggregate({
      where: { tenantId, method: "CASH", sale: { cashierId: userId, createdAt: range } },
      _sum: { amount: true },
    }),
    db.ledgerEntry.groupBy({
      by: ["account", "type"],
      where: { tenantId, userId, method: "CASH", createdAt: range },
      _sum: { amount: true },
    }),
    db.saleReturn.aggregate({
      where: { tenantId, userId, refundMethod: "CASH", createdAt: range },
      _sum: { total: true },
    }),
  ]);
  const sum = (account: string, type: string) =>
    ledger
      .filter((l) => l.account === account && l.type === type)
      .reduce((s, l) => s + (l._sum.amount ?? 0), 0);
  return {
    cashSales: sales._sum.amount ?? 0,
    // Qarz to'lovi va bonus berish hisobni kamaytiradi — yozuvlar manfiy
    debtPayments: -sum("DEBT", "PAYMENT"),
    bonusPayouts: -sum("BONUS", "PAYOUT"),
    cashRefunds: refunds._sum.total ?? 0,
  };
}

/** Smena hisobi: ochiq bo'lsa — hozirgacha, yopilgan bo'lsa — qotirilgan qiymatlar bilan. */
export async function shiftSummary(
  shift: {
    openingCash: number;
    openedAt: Date;
    closedAt: Date | null;
    userId: string;
    tenantId: string;
  },
  now = new Date(),
) {
  const parts = await shiftCashParts(
    shift.tenantId,
    shift.userId,
    shift.openedAt,
    shift.closedAt ?? now,
  );
  return { ...parts, expected: expectedShiftCash({ openingCash: shift.openingCash, ...parts }) };
}

export async function closeShift(
  tenantId: string,
  userId: string,
  input: ShiftCashInput,
  now = new Date(),
) {
  const data = shiftCashSchema.parse(input);
  const open = await getOpenShift(tenantId, userId);
  if (!open) throw new ServiceError(uz.shifts.notOpen);
  const summary = await shiftSummary(open, now);
  const { count } = await db.cashShift.updateMany({
    where: { id: open.id, tenantId, closedAt: null },
    data: {
      closedAt: now,
      expectedCash: summary.expected,
      countedCash: data.cash,
      note: data.note ?? open.note,
    },
  });
  if (count !== 1) throw new ServiceError(uz.shifts.notOpen);
  return { id: open.id, number: open.number, expected: summary.expected, counted: data.cash };
}

/** Smenalar ro'yxati: egasi/menejer — hammasi, kassir — faqat o'ziniki. */
export async function listShifts(tenantId: string, userId?: string, take = 100) {
  return db.cashShift.findMany({
    where: { tenantId, ...(userId ? { userId } : {}) },
    orderBy: { openedAt: "desc" },
    take,
    include: { user: { select: { name: true } } },
  });
}

export async function getShift(tenantId: string, id: string) {
  return db.cashShift.findFirst({
    where: { id, tenantId },
    include: { user: { select: { name: true } } },
  });
}
