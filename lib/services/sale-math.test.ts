import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { uz } from "@/lib/i18n/uz";
import {
  bonusReturnAmount,
  calcTotals,
  discountError,
  expectedShiftCash,
  lineTotal,
  masterBonus,
  parseQuantity,
  percentOf,
  promoPrice,
  returnLineAmount,
  settlePayments,
} from "./sale-math";

describe("ball, keshbek va aksiya", () => {
  it("ball naqd emas: qolgani naqd, qaytim faqat naqddan", () => {
    const r = settlePayments(100_000, { cash: 80_000, card: 0, transfer: 0, points: 30_000 });
    expect(r).toMatchObject({ ok: true, change: 10_000 });
    if (r.ok) {
      expect(r.payments).toEqual([
        { method: "CASH", amount: 70_000 },
        { method: "POINTS", amount: 30_000 },
      ]);
    }
  });

  it("ball + karta jami summadan oshmaydi", () => {
    const r = settlePayments(50_000, { cash: 0, card: 30_000, transfer: 0, points: 30_000 });
    expect(r).toEqual({ ok: false, error: uz.pos.nonCashOverpaid });
  });

  it("keshbek pastga yaxlitlanadi, foiz yo'q bo'lsa 0", () => {
    expect(percentOf(125_999, "2")).toBe(2_519);
    expect(percentOf(100_000, "1.5")).toBe(1_500);
    expect(percentOf(100_000, null)).toBe(0);
    expect(percentOf(-5, "10")).toBe(0);
  });

  it("aksiya narxi so'mgacha yaxlitlanadi", () => {
    expect(promoPrice(62_000, "10")).toBe(55_800);
    expect(promoPrice(999, new Decimal("15"))).toBe(849);
    expect(promoPrice(5, "50")).toBe(3); // 2.5 → 3
  });
});

describe("qaytarish summasi", () => {
  it("chegirmasiz: qator summasining qaytarilgan ulushi", () => {
    // 10 qop × 62 000 = 620 000; 3 qop qaytdi
    expect(
      returnLineAmount({ total: 620_000, quantity: "10" }, "3", {
        subtotal: 620_000,
        total: 620_000,
      }),
    ).toBe(186_000);
  });

  it("chegirma mutanosib taqsimlanadi va so'mgacha yaxlitlanadi", () => {
    // Jami 1 000 000, chegirma 100 000 (10%) → qaytgan tovar 10% arzonroq qaytadi
    expect(
      returnLineAmount({ total: 600_000, quantity: "4" }, "1", {
        subtotal: 1_000_000,
        total: 900_000,
      }),
    ).toBe(135_000);
    // Kasr miqdor: 1,5 metrdan 0,5 metr
    expect(
      returnLineAmount({ total: 14_250, quantity: "1.5" }, new Decimal("0.5"), {
        subtotal: 14_250,
        total: 14_250,
      }),
    ).toBe(4750);
  });

  it("usta bonusining qaytariladigan qismi", () => {
    expect(bonusReturnAmount(18_600, 186_000, 620_000)).toBe(5580);
    expect(bonusReturnAmount(0, 100, 1000)).toBe(0);
  });
});

describe("smenada kutilgan naqd", () => {
  it("ochilishdagi naqd + tushum − chiqim", () => {
    expect(
      expectedShiftCash({
        openingCash: 200_000,
        cashSales: 1_500_000,
        debtPayments: 300_000,
        bonusPayouts: 50_000,
        cashRefunds: 62_000,
      }),
    ).toBe(1_888_000);
  });
});

describe("parseQuantity", () => {
  it("vergul va nuqtani qabul qiladi", () => {
    const r = parseQuantity("1,5", "METER");
    expect(r.ok && r.value.toString()).toBe("1.5");
    expect(parseQuantity("2.25", "TON").ok).toBe(true);
  });

  it("dona, qop kabi birliklarda kasrni rad etadi", () => {
    expect(parseQuantity("1.5", "BAG")).toEqual({ ok: false, error: uz.pos.wholeNumberOnly });
    expect(parseQuantity("3", "PIECE").ok).toBe(true);
  });

  it("nol, manfiy, matn va 3 xonadan ko'p kasrni rad etadi", () => {
    expect(parseQuantity("0", "METER").ok).toBe(false);
    expect(parseQuantity("-1", "METER").ok).toBe(false);
    expect(parseQuantity("abc", "METER").ok).toBe(false);
    expect(parseQuantity("", "METER").ok).toBe(false);
    expect(parseQuantity("1.2345", "TON")).toEqual({ ok: false, error: uz.pos.tooManyDecimals });
  });

  it("inventarizatsiyada 0 ga ruxsat, manfiyga — yo'q", () => {
    expect(parseQuantity("0", "BAG", { allowZero: true }).ok).toBe(true);
    expect(parseQuantity("-1", "BAG", { allowZero: true }).ok).toBe(false);
  });

  it("juda katta miqdorni rad etadi", () => {
    expect(parseQuantity("2000000", "KG").ok).toBe(false);
  });
});

describe("lineTotal", () => {
  it("decimal bilan aniq hisoblaydi", () => {
    expect(lineTotal(9500, new Decimal("1.5"))).toBe(14250);
    // number bilan 0.1 * 3 = 0.30000000000000004 bo'lardi
    expect(lineTotal(10, new Decimal("0.1").mul(3))).toBe(3);
    expect(lineTotal(10800000, new Decimal("0.333"))).toBe(3596400);
  });

  it("so'mgacha yaxlitlaydi (0.5 — yuqoriga)", () => {
    expect(lineTotal(1001, new Decimal("0.5"))).toBe(501);
    expect(lineTotal(1000, new Decimal("0.0004"))).toBe(0);
  });
});

describe("calcTotals va discountError", () => {
  it("jami va chegirmani hisoblaydi", () => {
    expect(calcTotals([62000, 14250], 1250)).toEqual({
      subtotal: 76250,
      discount: 1250,
      total: 75000,
    });
  });

  it("chegirma jami summadan oshmasin", () => {
    expect(discountError(100, 50)).toBe(uz.pos.discountTooLarge);
    expect(discountError(-1, 50)).not.toBeNull();
    expect(discountError(50, 50)).toBeNull();
  });
});

describe("settlePayments", () => {
  it("naqddan qaytim beradi", () => {
    const r = settlePayments(75000, { cash: 100000, card: 0, transfer: 0 });
    expect(r).toEqual({
      ok: true,
      payments: [{ method: "CASH", amount: 75000 }],
      cashReceived: 100000,
      change: 25000,
    });
  });

  it("aralash to'lov: karta + naqd", () => {
    const r = settlePayments(75000, { cash: 30000, card: 50000, transfer: 0 });
    expect(r.ok && r.payments).toEqual([
      { method: "CASH", amount: 25000 },
      { method: "CARD", amount: 50000 },
    ]);
    expect(r.ok && r.change).toBe(5000);
  });

  it("yetmasa rad etadi", () => {
    expect(settlePayments(75000, { cash: 70000, card: 0, transfer: 0 })).toEqual({
      ok: false,
      error: uz.pos.notEnoughPaid,
    });
  });

  it("kartadan ortiqcha to'lovni rad etadi (kartaga qaytim yo'q)", () => {
    expect(settlePayments(75000, { cash: 0, card: 80000, transfer: 0 })).toEqual({
      ok: false,
      error: uz.pos.nonCashOverpaid,
    });
  });

  it("to'lovlar yig'indisi har doim jami summaga teng", () => {
    const r = settlePayments(123456, { cash: 200000, card: 23456, transfer: 0 });
    expect(r.ok && r.payments.reduce((s, p) => s + p.amount, 0)).toBe(123456);
  });

  it("qisman nasiya: naqd + nasiya, nasiyadan qaytim yo'q", () => {
    const r = settlePayments(500000, { cash: 200000, card: 0, transfer: 0, debt: 300000 });
    expect(r.ok && r.payments).toEqual([
      { method: "CASH", amount: 200000 },
      { method: "DEBT", amount: 300000 },
    ]);
    expect(settlePayments(500000, { cash: 0, card: 0, transfer: 0, debt: 600000 })).toEqual({
      ok: false,
      error: uz.pos.nonCashOverpaid,
    });
  });

  it("0 so'mlik sotuv (100% chegirma) to'lovsiz o'tadi", () => {
    expect(settlePayments(0, { cash: 0, card: 0, transfer: 0 })).toMatchObject({
      ok: true,
      payments: [],
    });
  });
});

describe("masterBonus", () => {
  it("foizni hisoblaydi va so'mgacha yaxlitlaydi", () => {
    expect(masterBonus(1_000_000, "3")).toBe(30000);
    expect(masterBonus(137_000, "2.5")).toBe(3425);
    expect(masterBonus(333, "1.5")).toBe(5); // 4.995 → 5
    expect(masterBonus(0, "5")).toBe(0);
  });
});
