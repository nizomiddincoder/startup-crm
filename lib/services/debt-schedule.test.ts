import { describe, expect, it } from "vitest";
import { allocateDebt, debtStatus, shouldRemind, type DebtLedgerRow } from "./debt-schedule";

// Toshkent vaqti bilan sana: "2026-11-15" → shu kun 00:00 (UTC+5)
const day = (s: string) => new Date(`${s}T00:00:00+05:00`);
const at = (s: string) => new Date(`${s}T12:00:00+05:00`);

const sale = (
  amount: number,
  created: string,
  due: string | null,
  saleId = created,
): DebtLedgerRow => ({
  type: "SALE",
  amount,
  createdAt: at(created),
  dueDate: due ? day(due) : null,
  saleId,
});
const payment = (amount: number, created: string): DebtLedgerRow => ({
  type: "PAYMENT",
  amount: -amount,
  createdAt: at(created),
  dueDate: null,
  saleId: null,
});

describe("allocateDebt (FIFO)", () => {
  it("to'lov eng eski qarzni yopadi", () => {
    const open = allocateDebt([
      sale(100000, "2026-10-01", "2026-10-10", "s1"),
      sale(50000, "2026-10-05", "2026-11-05", "s2"),
      payment(120000, "2026-10-20"),
    ]);
    expect(open).toEqual([expect.objectContaining({ saleId: "s2", outstanding: 30000 })]);
  });

  it("to'lov sotuvdan oldin kelgan bo'lsa ham to'g'ri hisoblaydi va to'liq yopilgan qarzni qaytarmaydi", () => {
    expect(allocateDebt([payment(10000, "2026-10-01"), sale(10000, "2026-10-02", null)])).toEqual(
      [],
    );
  });
});

describe("debtStatus", () => {
  const now = at("2026-11-15");
  it("muddati o'tgan, bugun va ertaga keladigan qismlarni ajratadi", () => {
    const s = debtStatus(
      [
        {
          saleId: "a",
          createdAt: at("2026-10-01"),
          dueDate: day("2026-11-10"),
          outstanding: 30000,
        },
        {
          saleId: "b",
          createdAt: at("2026-10-02"),
          dueDate: day("2026-11-15"),
          outstanding: 20000,
        },
        {
          saleId: "c",
          createdAt: at("2026-10-03"),
          dueDate: day("2026-11-16"),
          outstanding: 10000,
        },
        { saleId: "d", createdAt: at("2026-10-04"), dueDate: null, outstanding: 5000 },
      ],
      now,
    );
    expect(s).toMatchObject({ total: 65000, overdue: 30000, dueToday: 20000, dueTomorrow: 10000 });
    expect(s.nextDue).toEqual(day("2026-11-15"));
    expect(s.oldestOverdue).toEqual(day("2026-11-10"));
  });
});

describe("shouldRemind", () => {
  const now = at("2026-11-15");
  const base = {
    total: 10000,
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0,
    nextDue: null,
    oldestOverdue: null,
  };

  it("ertaga yoki bugun muddat — kuniga bir marta", () => {
    expect(shouldRemind({ ...base, dueTomorrow: 10000 }, null, now)).toBe(true);
    expect(shouldRemind({ ...base, dueToday: 10000 }, at("2026-11-14"), now)).toBe(true);
    expect(
      shouldRemind({ ...base, dueToday: 10000 }, new Date(now.getTime() - 3600_000), now),
    ).toBe(false);
  });

  it("muddati o'tgan — har 3 kunda", () => {
    const overdue = { ...base, overdue: 10000 };
    expect(shouldRemind(overdue, null, now)).toBe(true);
    expect(shouldRemind(overdue, at("2026-11-13"), now)).toBe(false);
    expect(shouldRemind(overdue, at("2026-11-12"), now)).toBe(true);
  });

  it("muddatsiz yoki qarzsiz — eslatma yo'q", () => {
    expect(shouldRemind(base, null, now)).toBe(false);
    expect(shouldRemind({ ...base, total: 0, dueToday: 0 }, null, now)).toBe(false);
  });
});
