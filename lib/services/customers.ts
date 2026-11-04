/**
 * Mijozlar, nasiya (DEBT hisobi) va usta bonusi (BONUS hisobi).
 * QOIDA: qarz va bonus qoldig'i faqat LedgerEntry yig'indisi — alohida ustun yo'q.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import {
  bonusPayoutSchema,
  customerSchema,
  debtPaymentSchema,
  type BonusPayoutInput,
  type CustomerInput,
  type DebtPaymentInput,
} from "@/lib/validation/customer";
import { allocateDebt, debtStatus, type DebtLedgerRow, type OpenDebt } from "./debt-schedule";
import { isUniqueViolation, ServiceError } from "./errors";

type Client = Prisma.TransactionClient | typeof db;

export type Balances = { debt: number; bonus: number; points: number };

/** customerId → { debt, bonus, points }. Yozuvi yo'q mijoz — 0. */
export async function getAccountBalances(
  tenantId: string,
  customerIds: string[],
  client: Client = db,
): Promise<Map<string, Balances>> {
  const empty = () => ({ debt: 0, bonus: 0, points: 0 });
  const map = new Map<string, Balances>(customerIds.map((id) => [id, empty()]));
  if (customerIds.length === 0) return map;
  const rows = await client.ledgerEntry.groupBy({
    by: ["customerId", "account"],
    where: { tenantId, customerId: { in: customerIds } },
    _sum: { amount: true },
  });
  for (const row of rows) {
    const b = map.get(row.customerId) ?? empty();
    const amount = row._sum.amount ?? 0;
    if (row.account === "DEBT") b.debt = amount;
    else if (row.account === "BONUS") b.bonus = amount;
    else b.points = amount;
    map.set(row.customerId, b);
  }
  return map;
}

/** Mijozlarning ochiq (to'lanmagan) nasiyalari FIFO bo'yicha: customerId → OpenDebt[]. */
export async function getOpenDebts(tenantId: string, customerIds?: string[]) {
  const rows = await db.ledgerEntry.findMany({
    where: {
      tenantId,
      account: "DEBT",
      ...(customerIds ? { customerId: { in: customerIds } } : {}),
    },
    select: {
      customerId: true,
      type: true,
      amount: true,
      dueDate: true,
      createdAt: true,
      saleId: true,
    },
  });
  const byCustomer = new Map<string, DebtLedgerRow[]>();
  for (const r of rows) {
    const list = byCustomer.get(r.customerId) ?? [];
    list.push({ ...r, type: r.type === "SALE" ? "SALE" : "PAYMENT" });
    byCustomer.set(r.customerId, list);
  }
  const result = new Map<string, OpenDebt[]>();
  for (const [id, list] of byCustomer) {
    const open = allocateDebt(list);
    if (open.length) result.set(id, open);
  }
  return result;
}

/**
 * Mijoz qatorini tranzaksiya oxirigacha qulflaydi (bir vaqtda ikki to'lov qarzdan oshib ketmasin)
 * va u shu do'konniki ekanini tekshiradi.
 */
export async function lockCustomer(tx: Prisma.TransactionClient, tenantId: string, id: string) {
  const { count } = await tx.customer.updateMany({
    where: { id, tenantId, isActive: true },
    data: { updatedAt: new Date() },
  });
  if (count === 0) throw new ServiceError(uz.customers.notFound);
  return tx.customer.findUniqueOrThrow({ where: { id } });
}

export type CustomerFilter = {
  search?: string;
  debtorsOnly?: boolean;
  mastersOnly?: boolean;
  /** Faqat muddati o'tgan nasiyasi borlar (paneldagi "Muddati o'tgan" raqami shu ro'yxatdan) */
  overdueOnly?: boolean;
};

export async function listCustomers(
  tenantId: string,
  filter: CustomerFilter = {},
  now = new Date(),
) {
  const search = filter.search?.trim();
  const customers = await db.customer.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(filter.mastersOnly ? { isMaster: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search.replace(/\D/g, "") || search } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 500,
  });
  const balances = await getAccountBalances(
    tenantId,
    customers.map((c) => c.id),
  );
  // Muddati o'tgan qism (FIFO bo'yicha) — faqat shu filtr uchun hisoblanadi
  const open = filter.overdueOnly
    ? await getOpenDebts(
        tenantId,
        customers.map((c) => c.id),
      )
    : null;
  const rows = customers.map((c) => ({
    ...c,
    bonusPercent: c.bonusPercent?.toString() ?? null,
    ...(balances.get(c.id) ?? { debt: 0, bonus: 0, points: 0 }),
    overdue: open?.has(c.id) ? debtStatus(open.get(c.id)!, now).overdue : 0,
  }));
  const items = filter.overdueOnly
    ? rows.filter((r) => r.overdue > 0)
    : filter.debtorsOnly
      ? rows.filter((r) => r.debt > 0)
      : rows;
  return {
    items,
    totalDebt: items.reduce((s, r) => s + Math.max(r.debt, 0), 0),
    totalOverdue: items.reduce((s, r) => s + r.overdue, 0),
  };
}

/** Kassa uchun tezkor qidiruv. */
export async function searchCustomers(
  tenantId: string,
  query: string,
  { mastersOnly = false }: { mastersOnly?: boolean } = {},
) {
  const q = query.trim();
  if (!q) return [];
  const digits = q.replace(/\D/g, "");
  const customers = await db.customer.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(mastersOnly ? { isMaster: true } : {}),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
    select: {
      id: true,
      name: true,
      phone: true,
      isMaster: true,
      creditLimit: true,
      discountPercent: true,
    },
  });
  const balances = await getAccountBalances(
    tenantId,
    customers.map((c) => c.id),
  );
  return customers.map((c) => ({
    ...c,
    discountPercent: c.discountPercent?.toString() ?? null,
    debt: balances.get(c.id)?.debt ?? 0,
    points: balances.get(c.id)?.points ?? 0,
  }));
}

export async function getCustomer(tenantId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, tenantId } });
  if (!customer) return null;
  const [balances, entries] = await Promise.all([
    getAccountBalances(tenantId, [id]),
    db.ledgerEntry.findMany({
      where: { tenantId, customerId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
      include: {
        user: { select: { name: true } },
        sale: { select: { id: true, number: true, total: true } },
      },
    }),
  ]);
  return {
    customer: { ...customer, bonusPercent: customer.bonusPercent?.toString() ?? null },
    balances: balances.get(id) ?? { debt: 0, bonus: 0, points: 0 },
    entries,
  };
}

/**
 * `canManage` (egasi/menejer) bo'lmasa — usta belgisi, bonus foizi va nasiya limiti
 * o'zgartirilmaydi (kassir faqat ism, telefon va izohni kiritadi).
 */
function toData(input: CustomerInput, canManage: boolean) {
  const data = customerSchema.parse(input);
  const base = { name: data.name, phone: data.phone ?? null, note: data.note ?? null };
  if (!canManage) return base;
  return {
    ...base,
    creditLimit: data.creditLimit ?? null,
    discountPercent: data.discountPercent ?? null,
    isMaster: data.isMaster,
    bonusPercent: data.isMaster ? (data.bonusPercent ?? null) : null,
  };
}

function rethrowPhone(error: unknown): never {
  if (isUniqueViolation(error)) throw new ServiceError(uz.customers.phoneTaken, "phone");
  throw error;
}

export async function createCustomer(tenantId: string, input: CustomerInput, canManage: boolean) {
  const data = toData(input, canManage);
  try {
    return await db.customer.create({
      data: { tenantId, ...data },
      select: { id: true, name: true, phone: true, isMaster: true, creditLimit: true },
    });
  } catch (error) {
    return rethrowPhone(error);
  }
}

export async function updateCustomer(
  tenantId: string,
  id: string,
  input: CustomerInput,
  canManage: boolean,
) {
  const data = toData(input, canManage);
  try {
    const { count } = await db.customer.updateMany({ where: { id, tenantId }, data });
    if (count === 0) throw new ServiceError(uz.customers.notFound);
  } catch (error) {
    rethrowPhone(error);
  }
}

/** Qarz to'lovini qabul qilish. Qarzdan ortiq to'lov qabul qilinmaydi. */
export async function receiveDebtPayment(
  tenantId: string,
  userId: string,
  customerId: string,
  input: DebtPaymentInput,
) {
  const data = debtPaymentSchema.parse(input);
  return db.$transaction(async (tx) => {
    await lockCustomer(tx, tenantId, customerId);
    const { debt } = (await getAccountBalances(tenantId, [customerId], tx)).get(customerId)!;
    if (debt <= 0) throw new ServiceError(uz.customers.nothingToPay, "amount");
    if (data.amount > debt) throw new ServiceError(uz.customers.paymentTooLarge, "amount");
    return tx.ledgerEntry.create({
      data: {
        tenantId,
        customerId,
        account: "DEBT",
        type: "PAYMENT",
        amount: -data.amount,
        method: data.method,
        note: data.note,
        userId,
      },
      select: { id: true },
    });
  });
}

/**
 * Ustaga bonus berish. method = DEBT — bonus ustaning o'z qarzidan ayiriladi
 * (bonus PAYOUT va qarz PAYMENT bir vaqtda yoziladi).
 */
export async function payMasterBonus(
  tenantId: string,
  userId: string,
  masterId: string,
  input: BonusPayoutInput,
) {
  const data = bonusPayoutSchema.parse(input);
  return db.$transaction(async (tx) => {
    const master = await lockCustomer(tx, tenantId, masterId);
    if (!master.isMaster) throw new ServiceError(uz.customers.notMaster);
    const balances = (await getAccountBalances(tenantId, [masterId], tx)).get(masterId)!;
    if (balances.bonus <= 0) throw new ServiceError(uz.customers.noBonus, "amount");
    if (data.amount > balances.bonus) {
      throw new ServiceError(uz.customers.payoutTooLarge, "amount");
    }
    if (data.method === "DEBT" && data.amount > balances.debt) {
      throw new ServiceError(uz.customers.offsetTooLarge, "amount");
    }

    await tx.ledgerEntry.create({
      data: {
        tenantId,
        customerId: masterId,
        account: "BONUS",
        type: "PAYOUT",
        amount: -data.amount,
        method: data.method,
        note: data.note,
        userId,
      },
    });
    if (data.method === "DEBT") {
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          customerId: masterId,
          account: "DEBT",
          type: "PAYMENT",
          amount: -data.amount,
          method: "DEBT",
          note: uz.customers.offsetDebt,
          userId,
        },
      });
    }
  });
}
