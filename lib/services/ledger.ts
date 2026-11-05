import { db } from "@/lib/db";
import { getAccountBalances } from "./customers";

type Entry = {
  id: string;
  account: string;
  type: string;
  amount: number;
  method: string | null;
  dueDate: string | null;
  note: string | null;
  createdAt: Date;
  user: { name: string } | null;
  sale: { id: string; number: number; total: number } | null;
};

export async function listLedgerEntries(tenantId: string, customerId?: string | null) {
  return db.ledgerEntry.findMany({
    where: { tenantId, ...(customerId ? { customerId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true } },
      sale: { select: { id: true, number: true, total: true } },
    },
  });
}

export async function getAccountSummary(tenantId: string, customerId?: string | null) {
  const ids = customerId ? [customerId] : [];
  const balances = await getAccountBalances(tenantId, ids);
  const map = balances as Map<string, { debt: number; bonus: number; points: number }>;
  if (customerId) {
    const b = map.get(customerId) ?? { debt: 0, bonus: 0, points: 0 };
    return { debt: b.debt, bonus: b.bonus, points: b.points };
  }
  let debt = 0, bonus = 0, points = 0;
  for (const b of map.values()) {
    debt += b.debt;
    bonus += b.bonus;
    points += b.points;
  }
  return { debt, bonus, points };
}
