/**
 * Sotuv va smeta — integratsiya testlari (haqiqiy baza). Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import {
  cancelEstimate,
  createEstimate,
  getEstimate,
  getEstimateForPos,
  listEstimates,
} from "./estimates";
import { createProduct, setProductActive } from "./products";
import { createSale, getSale, listSalesForDay, tashkentDayRange } from "./sales";

const shopA = `test-a-${randomUUID()}`;
const shopB = `test-b-${randomUUID()}`;
let cashierA: string;
let cashierB: string;
let cement: string; // qop, 62 000
let rebar: string; // metr, 9 500
let foreign: string; // B do'konining mahsuloti

const noPay = { cash: 0, card: 0, transfer: 0 };

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "A" },
      { id: shopB, name: "B" },
    ],
  });
  const users = await Promise.all(
    [shopA, shopB].map((tenantId) =>
      db.user.create({
        data: {
          tenantId,
          name: "Kassir",
          phone: `+99899${randomUUID().slice(0, 7)}`,
          passwordHash: "x",
        },
      }),
    ),
  );
  [cashierA, cashierB] = users.map((u) => u.id);
  cement = (await createProduct(shopA, { name: "Sement", unit: "BAG", salePrice: 62000 })).id;
  rebar = (await createProduct(shopA, { name: "Armatura", unit: "METER", salePrice: 9500 })).id;
  foreign = (await createProduct(shopB, { name: "B tovari", unit: "PIECE", salePrice: 1000 })).id;
});

afterAll(async () => {
  // Bog'liq yozuvlar tartib bilan o'chiriladi (sotuv → mahsulot cheklovlari)
  for (const tenantId of [shopA, shopB]) {
    await db.stockMovement.deleteMany({ where: { tenantId } });
    await db.sale.deleteMany({ where: { tenantId } });
    await db.estimate.deleteMany({ where: { tenantId } });
  }
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("createSale", () => {
  it("summani serverda hisoblaydi, qaytim va ombor harakatini yozadi", async () => {
    const sale = await createSale(shopA, cashierA, {
      items: [
        { productId: cement, quantity: "2" },
        { productId: rebar, quantity: "1,5" },
      ],
      discount: "1 250",
      payments: { cash: "150 000", card: "", transfer: "" },
    });

    const saved = await getSale(shopA, sale.id);
    expect(saved).toMatchObject({ subtotal: 138250, discount: 1250, total: 137000 });
    expect(saved?.cashReceived).toBe(150000);
    expect(saved?.change).toBe(13000);
    expect(saved?.payments).toEqual([expect.objectContaining({ method: "CASH", amount: 137000 })]);
    expect(saved?.items.map((i) => [i.name, i.quantity.toString(), i.total])).toEqual([
      ["Sement", "2", 124000],
      ["Armatura", "1.5", 14250],
    ]);

    const movements = await db.stockMovement.findMany({
      where: { tenantId: shopA, saleItem: { saleId: sale.id } },
      orderBy: { quantity: "asc" },
    });
    expect(movements.map((m) => [m.type, m.quantity.toString()])).toEqual([
      ["SALE", "-2"],
      ["SALE", "-1.5"],
    ]);
  });

  it("chek raqamlari har do'konda alohida va ketma-ket (parallel sotuvda ham)", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        createSale(shopB, cashierB, {
          items: [{ productId: foreign, quantity: "1" }],
          payments: { ...noPay, cash: 1000 },
        }),
      ),
    );
    expect(results.map((r) => r.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("boshqa do'kon mahsulotini sotib bo'lmaydi", async () => {
    await expect(
      createSale(shopA, cashierA, {
        items: [{ productId: foreign, quantity: "1" }],
        payments: { ...noPay, cash: 1000 },
      }),
    ).rejects.toMatchObject({ message: uz.pos.productUnavailable });
  });

  it("boshqa do'kon chekini ko'rib bo'lmaydi", async () => {
    const sale = await createSale(shopB, cashierB, {
      items: [{ productId: foreign, quantity: "1" }],
      payments: { ...noPay, cash: 1000 },
    });
    expect(await getSale(shopA, sale.id)).toBeNull();
    const todayA = await listSalesForDay(shopA);
    expect(todayA.some((s) => s.id === sale.id)).toBe(false);
  });

  it("qop kasr miqdorda sotilmaydi, yetmagan to'lov rad etiladi — hech narsa saqlanmaydi", async () => {
    const before = await db.sale.count({ where: { tenantId: shopA } });
    await expect(
      createSale(shopA, cashierA, {
        items: [{ productId: cement, quantity: "1.5" }],
        payments: { ...noPay, cash: 100000 },
      }),
    ).rejects.toMatchObject({ message: uz.pos.wholeNumberOnly });
    await expect(
      createSale(shopA, cashierA, {
        items: [{ productId: cement, quantity: "1" }],
        payments: { ...noPay, cash: 1000 },
      }),
    ).rejects.toMatchObject({ field: "payments" });
    expect(await db.sale.count({ where: { tenantId: shopA } })).toBe(before);
  });

  it("arxivdagi mahsulot sotilmaydi", async () => {
    const old = await createProduct(shopA, { name: "Eski", unit: "PIECE", salePrice: 500 });
    await setProductActive(shopA, old.id, false);
    await expect(
      createSale(shopA, cashierA, {
        items: [{ productId: old.id, quantity: "1" }],
        payments: { ...noPay, cash: 500 },
      }),
    ).rejects.toMatchObject({ message: uz.pos.productUnavailable });
  });
});

describe("smeta", () => {
  it("smeta narxi qotiriladi va sotuvda shu narx ishlatiladi; ikki marta sotilmaydi", async () => {
    const estimate = await createEstimate(shopA, cashierA, {
      items: [{ productId: cement, quantity: "10" }],
      discount: "20000",
      customerName: "Usta Rustam",
      customerPhone: "90 123 45 67",
    });
    const saved = await getEstimate(shopA, estimate.id);
    expect(saved).toMatchObject({ total: 600000, customerPhone: "+998901234567", status: "OPEN" });

    // Narx oshdi — smeta bo'yicha sotuv baribir eski narxda
    await db.product.update({ where: { id: cement }, data: { salePrice: 65000 } });
    const forPos = await getEstimateForPos(shopA, estimate.id);
    expect(forPos?.items[0]).toMatchObject({ price: 62000, quantity: "10" });

    const sale = await createSale(shopA, cashierA, {
      estimateId: estimate.id,
      items: [{ productId: cement, quantity: "10" }],
      discount: 20000,
      payments: { ...noPay, card: 600000 },
    });
    expect((await getSale(shopA, sale.id))?.total).toBe(600000);
    expect((await getEstimate(shopA, estimate.id))?.status).toBe("CONVERTED");
    expect(await getEstimateForPos(shopA, estimate.id)).toBeNull();

    await expect(
      createSale(shopA, cashierA, {
        estimateId: estimate.id,
        items: [{ productId: cement, quantity: "1" }],
        payments: { ...noPay, cash: 100000 },
      }),
    ).rejects.toMatchObject({ message: uz.pos.estimateNotOpen });

    await db.product.update({ where: { id: cement }, data: { salePrice: 62000 } });
  });

  it("boshqa do'kon smetasini ko'rish, yuklash va bekor qilish mumkin emas", async () => {
    const estimate = await createEstimate(shopA, cashierA, {
      items: [{ productId: rebar, quantity: "12.5" }],
    });
    expect(await getEstimate(shopB, estimate.id)).toBeNull();
    expect(await getEstimateForPos(shopB, estimate.id)).toBeNull();
    await expect(cancelEstimate(shopB, estimate.id)).rejects.toBeTruthy();
    await expect(
      createSale(shopB, cashierB, {
        estimateId: estimate.id,
        items: [{ productId: foreign, quantity: "1" }],
        payments: { ...noPay, cash: 1000 },
      }),
    ).rejects.toMatchObject({ message: uz.pos.estimateNotOpen });

    await cancelEstimate(shopA, estimate.id);
    expect((await listEstimates(shopA, { status: "CANCELLED" })).map((e) => e.id)).toContain(
      estimate.id,
    );
  });

  it("mijoz ismi yoki raqami bo'yicha qidiradi", async () => {
    const e = await createEstimate(shopA, cashierA, {
      items: [{ productId: rebar, quantity: "3" }],
      customerName: "Qidiruv Testov",
    });
    expect((await listEstimates(shopA, { search: "testov" })).map((x) => x.id)).toContain(e.id);
    expect((await listEstimates(shopA, { search: String(e.number) })).map((x) => x.id)).toContain(
      e.id,
    );
  });
});

describe("tashkentDayRange", () => {
  it("Toshkent kuni UTC+5 bo'yicha", () => {
    // Toshkentda 25-oktyabr 02:00 = UTC 24-oktyabr 21:00
    const { from, to } = tashkentDayRange(new Date("2026-10-24T21:00:00Z"));
    expect(from.toISOString()).toBe("2026-10-24T19:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-25T19:00:00.000Z");
  });
});
