/**
 * Ombor — integratsiya testlari (haqiqiy baza). Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { createProduct, getProduct, searchProductsForPos } from "./products";
import { createSale } from "./sales";
import {
  createInventory,
  createReceipt,
  createWriteOff,
  getBalances,
  getDocument,
  getProductMovements,
  listDocuments,
  listStock,
} from "./stock";

const shopA = `test-a-${randomUUID()}`;
const shopB = `test-b-${randomUUID()}`;
let userA: string;
let userB: string;

async function makeUser(tenantId: string) {
  const user = await db.user.create({
    data: {
      tenantId,
      name: "Omborchi",
      phone: `+99898${randomUUID().slice(0, 7)}`,
      passwordHash: "x",
    },
  });
  return user.id;
}

async function balance(tenantId: string, productId: string) {
  return (await getBalances(tenantId, [productId])).get(productId)?.toString();
}

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "A" },
      { id: shopB, name: "B" },
    ],
  });
  userA = await makeUser(shopA);
  userB = await makeUser(shopB);
});

afterAll(async () => {
  for (const tenantId of [shopA, shopB]) {
    await db.stockMovement.deleteMany({ where: { tenantId } });
    await db.sale.deleteMany({ where: { tenantId } });
    await db.stockDocument.deleteMany({ where: { tenantId } });
  }
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("kirim, sotuv, hisobdan chiqarish", () => {
  it("qoldiq faqat harakatlar yig'indisi; kirim kelish narxini yangilaydi", async () => {
    const cement = await createProduct(shopA, { name: "Sement", unit: "BAG", salePrice: 62000 });
    expect(await balance(shopA, cement.id)).toBe("0");

    const receipt = await createReceipt(shopA, userA, {
      supplierName: "Quvasoy zavodi",
      items: [{ productId: cement.id, quantity: "100", costPrice: "55 500" }],
    });
    expect(await balance(shopA, cement.id)).toBe("100");
    expect((await getProduct(shopA, cement.id))?.costPrice).toBe(55500);

    await createSale(shopA, userA, {
      items: [{ productId: cement.id, quantity: "3" }],
      payments: { cash: 186000, card: 0, transfer: 0 },
    });
    expect(await balance(shopA, cement.id)).toBe("97");

    await createWriteOff(shopA, userA, {
      note: "Tashishda yorildi",
      items: [{ productId: cement.id, quantity: "2" }],
    });
    expect(await balance(shopA, cement.id)).toBe("95");

    const doc = await getDocument(shopA, receipt.id);
    expect(doc).toMatchObject({ type: "RECEIPT", supplierName: "Quvasoy zavodi" });
    expect(doc?.items[0].quantity.toString()).toBe("100");

    const history = await getProductMovements(shopA, cement.id);
    expect(history?.movements.map((m) => [m.type, m.quantity, m.balanceAfter])).toEqual([
      ["WRITE_OFF", "-2", "95"],
      ["SALE", "-3", "97"],
      ["RECEIPT", "100", "100"],
    ]);
    expect(history?.movements[1].sale?.number).toBeGreaterThan(0);
  });

  it("kasr miqdor: metr va tonna", async () => {
    const rebar = await createProduct(shopA, { name: "Armatura", unit: "METER", salePrice: 9500 });
    await createReceipt(shopA, userA, { items: [{ productId: rebar.id, quantity: "120,5" }] });
    await createSale(shopA, userA, {
      items: [{ productId: rebar.id, quantity: "0.25" }],
      payments: { cash: 2375, card: 0, transfer: 0 },
    });
    expect(await balance(shopA, rebar.id)).toBe("120.25");
  });

  it("hisobdan chiqarishda sabab majburiy, qopni kasr sonda kiritib bo'lmaydi", async () => {
    const p = await createProduct(shopA, { name: "Gips", unit: "BAG", salePrice: 40000 });
    await expect(
      createWriteOff(shopA, userA, { note: "", items: [{ productId: p.id, quantity: "1" }] }),
    ).rejects.toThrow();
    await expect(
      createReceipt(shopA, userA, { items: [{ productId: p.id, quantity: "1.5" }] }),
    ).rejects.toMatchObject({ message: uz.pos.wholeNumberOnly });
    await expect(
      createReceipt(shopA, userA, {
        items: [
          { productId: p.id, quantity: "1" },
          { productId: p.id, quantity: "2" },
        ],
      }),
    ).rejects.toMatchObject({ message: uz.warehouse.duplicateLine });
    expect(await balance(shopA, p.id)).toBe("0");
  });
});

describe("inventarizatsiya", () => {
  it("qoldiqni sanalgan miqdorga tenglaydi, farqsiz qatorga harakat yozmaydi", async () => {
    const a = await createProduct(shopA, { name: "Profil", unit: "PIECE", salePrice: 24000 });
    const b = await createProduct(shopA, { name: "Kraska", unit: "LITER", salePrice: 42000 });
    await createReceipt(shopA, userA, {
      items: [
        { productId: a.id, quantity: "50" },
        { productId: b.id, quantity: "20" },
      ],
    });

    const inv = await createInventory(shopA, userA, {
      items: [
        { productId: a.id, quantity: "47" }, // 3 ta kam chiqdi
        { productId: b.id, quantity: "20" }, // farq yo'q
      ],
    });
    expect(await balance(shopA, a.id)).toBe("47");
    expect(await balance(shopA, b.id)).toBe("20");

    const doc = await getDocument(shopA, inv.id);
    expect(doc?.items.map((i) => [i.quantity.toString(), i.expected?.toString()])).toEqual([
      ["47", "50"],
      ["20", "20"],
    ]);
    const adjustments = await db.stockMovement.count({
      where: { tenantId: shopA, type: "ADJUSTMENT", productId: { in: [a.id, b.id] } },
    });
    expect(adjustments).toBe(1);

    // Hammasi tugagan — 0 ham kiritiladi
    await createInventory(shopA, userA, { items: [{ productId: b.id, quantity: "0" }] });
    expect(await balance(shopA, b.id)).toBe("0");
  });
});

describe("qoldiqlar ro'yxati va do'konlar ajratilishi", () => {
  it("kam qolgan va minusdagi mahsulotlarni belgilaydi, qiymatni hisoblaydi", async () => {
    const low = await createProduct(shopB, {
      name: "Kam",
      unit: "PIECE",
      salePrice: 1000,
      costPrice: 800,
      minStock: "10",
    });
    const ok = await createProduct(shopB, { name: "Yetarli", unit: "PIECE", salePrice: 1000 });
    const minus = await createProduct(shopB, { name: "Minus", unit: "PIECE", salePrice: 1000 });
    await createReceipt(shopB, userB, {
      items: [
        { productId: low.id, quantity: "5" },
        { productId: ok.id, quantity: "100" },
      ],
    });
    await createSale(shopB, userB, {
      items: [{ productId: minus.id, quantity: "2" }],
      payments: { cash: 2000, card: 0, transfer: 0 },
    });

    const { items, totalValue } = await listStock(shopB);
    const byName = Object.fromEntries(items.map((i) => [i.name, i]));
    expect(byName["Kam"]).toMatchObject({ balance: "5", low: true, value: 4000 });
    expect(byName["Yetarli"]).toMatchObject({ balance: "100", low: false });
    expect(byName["Minus"]).toMatchObject({ balance: "-2", low: true, negative: true, value: 0 });
    expect(totalValue).toBe(4000);

    const lowOnly = await listStock(shopB, { lowOnly: true });
    expect(lowOnly.items.map((i) => i.name).sort()).toEqual(["Kam", "Minus"]);

    const found = await searchProductsForPos(shopB, "Yetarli");
    expect(found[0].stock).toBe("100");
  });

  it("boshqa do'kon mahsulotiga kirim qilib, hujjatini ko'rib bo'lmaydi", async () => {
    const foreign = await createProduct(shopB, { name: "B mol", unit: "PIECE", salePrice: 1 });
    await expect(
      createReceipt(shopA, userA, { items: [{ productId: foreign.id, quantity: "10" }] }),
    ).rejects.toMatchObject({ message: uz.pos.productUnavailable });

    const docB = await createReceipt(shopB, userB, {
      items: [{ productId: foreign.id, quantity: "1" }],
    });
    expect(await getDocument(shopA, docB.id)).toBeNull();
    expect((await listDocuments(shopA)).some((d) => d.id === docB.id)).toBe(false);
    expect(await getProductMovements(shopA, foreign.id)).toBeNull();
    expect(await balance(shopA, foreign.id)).toBe("0");
  });
});
