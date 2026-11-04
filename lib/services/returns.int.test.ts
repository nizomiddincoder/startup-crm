/**
 * Qaytarish, smena, "muddati o'tgan" filtri va "ko'p sotiladigan" — integratsiya testlari
 * (haqiqiy baza). Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { createCustomer, getAccountBalances, listCustomers, receiveDebtPayment } from "./customers";
import { createProduct, topSellingProductsForPos } from "./products";
import { createReturn, getReturnable } from "./returns";
import { createSale, listReturnsForDay } from "./sales";
import { closeShift, getOpenShift, listShifts, openShift, shiftSummary } from "./shifts";
import { getBalances } from "./stock";
import { buildDailyReport } from "./telegram/reports";

const shopA = `test-ret-a-${randomUUID()}`;
const shopB = `test-ret-b-${randomUUID()}`;
let cashier: string;
let cashierB: string;
let cement: string; // qop, 62 000
let rebar: string; // metr, 9 500
let buyer: string;
let master: string;

const noPay = { cash: 0, card: 0, transfer: 0 };

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "A" },
      { id: shopB, name: "B" },
    ],
  });
  const [a, b] = await Promise.all(
    [shopA, shopB].map((tenantId) =>
      db.user.create({
        data: {
          tenantId,
          name: "Kassir",
          phone: `+99898${randomUUID().replace(/\D/g, "").slice(0, 7).padEnd(7, "1")}`,
          passwordHash: "x",
        },
      }),
    ),
  );
  cashier = a.id;
  cashierB = b.id;
  cement = (await createProduct(shopA, { name: "Sement", unit: "BAG", salePrice: 62000 })).id;
  rebar = (await createProduct(shopA, { name: "Armatura", unit: "METER", salePrice: 9500 })).id;
  buyer = (await createCustomer(shopA, { name: "Xaridor" }, true)).id;
  master = (await createCustomer(shopA, { name: "Usta", isMaster: "on", bonusPercent: "3" }, true))
    .id;
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("qaytarish", () => {
  it("qisman qaytarish: omborga qaytadi, summa chegirmaga mutanosib, ortig'i rad etiladi", async () => {
    // 10 qop × 62 000 = 620 000, chegirma 62 000 (10%) → 558 000
    const sale = await createSale(shopA, cashier, {
      items: [{ productId: cement, quantity: "10" }],
      discount: "62 000",
      payments: { ...noPay, cash: "558 000" },
    });
    const item = (await getReturnable(shopA, sale.id))!.items[0];

    const r = await createReturn(shopA, cashier, {
      saleId: sale.id,
      items: [{ saleItemId: item.id, quantity: "3" }],
      refundMethod: "CASH",
      reason: "Ortiqcha",
    });
    expect(r.total).toBe(167_400); // 3 × 62 000 × 0,9
    expect((await getBalances(shopA, [cement])).get(cement)!.toString()).toBe("-7");

    const after = (await getReturnable(shopA, sale.id))!;
    expect(after.items[0]).toMatchObject({ returned: "3", left: "7" });
    expect(after.returnedTotal).toBe(167_400);

    await expect(
      createReturn(shopA, cashier, {
        saleId: sale.id,
        items: [{ saleItemId: item.id, quantity: "8" }],
        refundMethod: "CASH",
      }),
    ).rejects.toThrow(uz.returns.tooMuch);
    // Qop — faqat butun son
    await expect(
      createReturn(shopA, cashier, {
        saleId: sale.id,
        items: [{ saleItemId: item.id, quantity: "1,5" }],
        refundMethod: "CASH",
      }),
    ).rejects.toThrow(uz.pos.wholeNumberOnly);
  });

  it("nasiyadan ayirish va usta bonusi qaytariladi", async () => {
    const sale = await createSale(shopA, cashier, {
      items: [{ productId: rebar, quantity: "100" }], // 950 000
      payments: { ...noPay, debt: "950 000" },
      customerId: buyer,
      masterId: master, // 3% → 28 500
    });
    const item = (await getReturnable(shopA, sale.id))!.items[0];
    await createReturn(shopA, cashier, {
      saleId: sale.id,
      items: [{ saleItemId: item.id, quantity: "20" }], // 190 000
      refundMethod: "DEBT",
    });
    const balances = await getAccountBalances(shopA, [buyer, master]);
    expect(balances.get(buyer)!.debt).toBe(760_000);
    expect(balances.get(master)!.bonus).toBe(22_800); // 28 500 − 5 700
  });

  it("mijozsiz chekni nasiyadan ayirib bo'lmaydi; boshqa do'kon cheki ko'rinmaydi", async () => {
    const sale = await createSale(shopA, cashier, {
      items: [{ productId: cement, quantity: "1" }],
      payments: { ...noPay, cash: "62 000" },
    });
    const item = (await getReturnable(shopA, sale.id))!.items[0];
    await expect(
      createReturn(shopA, cashier, {
        saleId: sale.id,
        items: [{ saleItemId: item.id, quantity: "1" }],
        refundMethod: "DEBT",
      }),
    ).rejects.toThrow(uz.returns.debtNeedsCustomer);
    expect(await getReturnable(shopB, sale.id)).toBeNull();
    await expect(
      createReturn(shopB, cashierB, {
        saleId: sale.id,
        items: [{ saleItemId: item.id, quantity: "1" }],
        refundMethod: "CASH",
      }),
    ).rejects.toThrow();
  });

  it("kunlik hisobot: tushumdan qaytarishlar ayiriladi", async () => {
    const report = await buildDailyReport(shopA, new Date());
    const returns = await listReturnsForDay(shopA);
    const returned = returns.reduce((s, r) => s + r.total, 0);
    expect(report.returnsCount).toBe(returns.length);
    expect(report.returnsTotal).toBe(returned);
    // 558 000 + 950 000 + 62 000 − (167 400 + 190 000)
    expect(report.revenue).toBe(558_000 + 950_000 + 62_000 - returned);
    expect(report.byMethod.CASH).toBe(558_000 + 62_000 - 167_400);
    expect(report.byMethod.DEBT).toBe(950_000 - 190_000);
  });
});

describe("smena", () => {
  it("ochish → naqd amallar → yopish: kutilgan naqd va farq", async () => {
    const opened = await openShift(shopA, cashier, { cash: "200 000" });
    await expect(openShift(shopA, cashier, { cash: "0" })).rejects.toThrow(uz.shifts.alreadyOpen);

    const sale = await createSale(shopA, cashier, {
      items: [{ productId: cement, quantity: "2" }],
      payments: { ...noPay, cash: "150 000" }, // 124 000, qaytim 26 000
    });
    await receiveDebtPayment(shopA, cashier, buyer, { amount: "60 000", method: "CASH" });
    const item = (await getReturnable(shopA, sale.id))!.items[0];
    await createReturn(shopA, cashier, {
      saleId: sale.id,
      items: [{ saleItemId: item.id, quantity: "1" }],
      refundMethod: "CASH",
    });

    const summary = await shiftSummary((await getOpenShift(shopA, cashier))!);
    expect(summary).toMatchObject({
      cashSales: 124_000,
      debtPayments: 60_000,
      cashRefunds: 62_000,
    });
    expect(summary.expected).toBe(200_000 + 124_000 + 60_000 - 62_000);

    const closed = await closeShift(shopA, cashier, { cash: "320 000" });
    expect(closed).toMatchObject({ number: opened.number, expected: 322_000, counted: 320_000 });
    expect(await getOpenShift(shopA, cashier)).toBeNull();
    await expect(closeShift(shopA, cashier, { cash: "0" })).rejects.toThrow(uz.shifts.notOpen);

    // Boshqa do'kon smenalari ko'rinmaydi
    expect(await listShifts(shopB)).toHaveLength(0);
    expect((await listShifts(shopA, cashier))[0]).toMatchObject({ expectedCash: 322_000 });
  });
});

describe("panel ro'yxatlari", () => {
  it("muddati o'tgan: faqat kechikkan qarzdorlar va summasi", async () => {
    const late = (await createCustomer(shopA, { name: "Kechikkan" }, true)).id;
    await createSale(shopA, cashier, {
      items: [{ productId: rebar, quantity: "10" }], // 95 000
      payments: { ...noPay, debt: "95 000" },
      customerId: late,
      dueDate: "2026-01-01",
    });
    const { items, totalOverdue } = await listCustomers(shopA, { overdueOnly: true });
    expect(items.map((c) => c.id)).toEqual([late]);
    expect(totalOverdue).toBe(95_000);
  });

  it("ko'p sotiladigan: cheklarda eng ko'p uchraganlar birinchi", async () => {
    const top = await topSellingProductsForPos(shopA);
    expect(top[0].id).toBe(cement);
    expect(top.map((p) => p.id)).toContain(rebar);
    expect(await topSellingProductsForPos(shopB)).toHaveLength(0);
  });
});
