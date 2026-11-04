/**
 * K5: bonus ballari (keshbek), aksiyalar va Telegram buyurtmalari — integratsiya testlari
 * (haqiqiy baza). Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { createCustomer, getAccountBalances } from "./customers";
import {
  changeDraftItem,
  customerShopsByChatId,
  getDraft,
  listOrders,
  newOrdersCount,
  orderCustomer,
  orderForPos,
  setOrderStatus,
  submitDraft,
} from "./orders";
import { createProduct, updateProduct } from "./products";
import { createPromotion, setCashbackPercent, setPromotionActive } from "./promotions";
import { createReturn, getReturnable } from "./returns";
import { createSale } from "./sales";

const shopA = `test-mkt-a-${randomUUID()}`;
const shopB = `test-mkt-b-${randomUUID()}`;
const chatId = `chat-${randomUUID()}`;
let cashier: string;
let cement: string; // qop, 62 000 — "Quruq qorishma" kategoriyasida
let paint: string; // litr, 40 000 — shu kategoriyada
let tile: string; // m², 100 000 — kategoriyasiz
let category: string;
let buyer: string;
let buyerB: string;
let productB: string;

const noPay = { cash: "", card: "", transfer: "" };

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "A do'kon" },
      { id: shopB, name: "B do'kon" },
    ],
  });
  cashier = (
    await db.user.create({
      data: {
        tenantId: shopA,
        name: "Kassir",
        phone: `+99897${randomUUID().replace(/\D/g, "").slice(0, 7).padEnd(7, "2")}`,
        passwordHash: "x",
      },
    })
  ).id;
  category = (await db.category.create({ data: { tenantId: shopA, name: "Qorishma" } })).id;
  cement = (
    await createProduct(shopA, {
      name: "Sement",
      unit: "BAG",
      salePrice: 62000,
      categoryId: category,
    })
  ).id;
  paint = (
    await createProduct(shopA, {
      name: "Bo'yoq",
      unit: "LITER",
      salePrice: 40000,
      categoryId: category,
    })
  ).id;
  tile = (await createProduct(shopA, { name: "Kafel", unit: "SQ_METER", salePrice: 100000 })).id;
  productB = (await createProduct(shopB, { name: "B mahsulot", unit: "PIECE", salePrice: 1000 }))
    .id;
  buyer = (await createCustomer(shopA, { name: "Xaridor" }, true)).id;
  buyerB = (await createCustomer(shopB, { name: "B xaridor" }, true)).id;
  await db.customer.updateMany({
    where: { id: { in: [buyer, buyerB] } },
    data: { telegramChatId: chatId },
  });
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("bonus ballari (keshbek)", () => {
  it("to'langan puldan ball yoziladi, keyingi xaridda ishlatiladi, ortig'i rad etiladi", async () => {
    await setCashbackPercent(shopA, { cashbackPercent: "2" });
    const first = await createSale(shopA, cashier, {
      items: [{ productId: tile, quantity: "5" }], // 500 000
      payments: { ...noPay, cash: "500 000" },
      customerId: buyer,
    });
    expect(first.earned).toBe(10_000);
    expect((await getAccountBalances(shopA, [buyer])).get(buyer)!.points).toBe(10_000);

    await expect(
      createSale(shopA, cashier, {
        items: [{ productId: tile, quantity: "1" }],
        payments: { ...noPay, cash: "80 000", points: "20 000" },
        customerId: buyer,
      }),
    ).rejects.toThrow(uz.promotions.pointsTooMany);
    await expect(
      createSale(shopA, cashier, {
        items: [{ productId: tile, quantity: "1" }],
        payments: { ...noPay, cash: "90 000", points: "10 000" },
      }),
    ).rejects.toThrow(uz.promotions.pointsNeedCustomer);

    // 100 000: 10 000 ball + 90 000 naqd → keshbek faqat 90 000 dan (1 800)
    const second = await createSale(shopA, cashier, {
      items: [{ productId: tile, quantity: "1" }],
      payments: { ...noPay, cash: "90 000", points: "10 000" },
      customerId: buyer,
    });
    expect(second.earned).toBe(1_800);
    expect((await getAccountBalances(shopA, [buyer])).get(buyer)!.points).toBe(1_800);

    // Qaytarishda ball qismi pul bo'lib qaytmaydi, yozilgan keshbek qaytariladi
    const ret = (await getReturnable(shopA, second.id))!;
    expect(ret.pointsPaid).toBe(10_000);
    const r = await createReturn(shopA, cashier, {
      saleId: second.id,
      items: [{ saleItemId: ret.items[0].id, quantity: "1" }],
      refundMethod: "CASH",
    });
    expect(r.total).toBe(90_000);
    expect((await getAccountBalances(shopA, [buyer])).get(buyer)!.points).toBe(0);
    await setCashbackPercent(shopA, { cashbackPercent: "" });
  });
});

describe("aksiyalar", () => {
  it("kategoriya aksiyasi narxni tushiradi, mahsulot aksiyasi ustun, o'chirilgani ishlamaydi", async () => {
    const today = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
    await createPromotion(shopA, {
      name: "Kategoriya",
      percent: "10",
      target: "category",
      categoryId: category,
      startsOn: today,
      endsOn: today,
    });
    const own = await createPromotion(shopA, {
      name: "Sement",
      percent: "20",
      target: "product",
      productId: cement,
      startsOn: today,
      endsOn: today,
    });
    const sale = await createSale(shopA, cashier, {
      items: [
        { productId: cement, quantity: "1" },
        { productId: paint, quantity: "1" },
        { productId: tile, quantity: "1" },
      ],
      payments: { ...noPay, cash: "185 600" },
    });
    const items = await db.saleItem.findMany({
      where: { saleId: sale.id },
      orderBy: { price: "asc" },
    });
    expect(items.map((i) => i.price)).toEqual([36_000, 49_600, 100_000]);

    await setPromotionActive(shopA, own.id, false);
    await setPromotionActive(
      shopB,
      (await db.promotion.findFirstOrThrow({ where: { tenantId: shopA, name: "Kategoriya" } })).id,
      false,
    );
    const again = await createSale(shopA, cashier, {
      items: [{ productId: cement, quantity: "1" }],
      payments: { ...noPay, cash: "55 800" },
    });
    // Mahsulot aksiyasi o'chdi → kategoriya 10% (boshqa do'kon uni o'chira olmadi)
    expect((await db.saleItem.findFirstOrThrow({ where: { saleId: again.id } })).price).toBe(
      55_800,
    );
    await db.promotion.updateMany({ where: { tenantId: shopA }, data: { isActive: false } });
  });

  it("boshqa do'kon mahsulotiga aksiya qo'yib bo'lmaydi", async () => {
    await expect(
      createPromotion(shopA, {
        name: "Begona",
        percent: "5",
        target: "product",
        productId: productB,
        startsOn: "2026-01-01",
        endsOn: "2026-01-02",
      }),
    ).rejects.toThrow(uz.products.notFound);
  });
});

describe("Telegram buyurtmalari", () => {
  it("chat — har do'konda o'z mijozi; begona mijoz ID ishlamaydi", async () => {
    const shops = await customerShopsByChatId(chatId);
    expect(shops.map((s) => s.tenantId).sort()).toEqual([shopA, shopB].sort());
    expect(await orderCustomer("boshqa-chat", buyer)).toBeNull();
    expect((await orderCustomer(chatId, buyer))?.tenantId).toBe(shopA);
  });

  it("savatcha → yuborish → kassada sotish (buyurtma DONE, ikkinchi marta sotilmaydi)", async () => {
    await expect(changeDraftItem(shopA, buyer, productB, 1)).rejects.toThrow(
      uz.pos.productUnavailable,
    );
    await changeDraftItem(shopA, buyer, cement, 1);
    await changeDraftItem(shopA, buyer, cement, 1);
    await changeDraftItem(shopA, buyer, paint, 1);
    await changeDraftItem(shopA, buyer, paint, -1); // 0 → qator o'chadi
    await changeDraftItem(shopA, buyer, tile, 1);
    const draft = (await getDraft(shopA, buyer))!;
    expect(draft.items.map((i) => [i.name, i.quantity])).toEqual([
      ["Kafel", "1"],
      ["Sement", "2"],
    ]);

    // Narx o'zgardi va kafel arxivlandi → yuborishda yangi narx, kafel tushib qoladi
    await updateProduct(shopA, cement, { name: "Sement", unit: "BAG", salePrice: 65000 });
    await db.product.update({ where: { id: tile }, data: { isActive: false } });
    const order = await submitDraft(shopA, buyer);
    expect(order.total).toBe(130_000);
    expect(order.lines).toHaveLength(1);
    expect(await getDraft(shopA, buyer)).toBeNull();
    await db.product.update({ where: { id: tile }, data: { isActive: true } });

    expect(await newOrdersCount(shopA)).toBe(1);
    expect(await newOrdersCount(shopB)).toBe(0);
    expect((await listOrders(shopB)).length).toBe(0);
    expect(await orderForPos(shopB, order.id)).toBeNull();

    await setOrderStatus(shopA, order.id, "ACCEPTED");
    await expect(setOrderStatus(shopA, order.id, "ACCEPTED")).rejects.toThrow(uz.orders.notOpen);
    const ready = await setOrderStatus(shopA, order.id, "READY");
    expect(ready.customer.telegramChatId).toBe(chatId);

    const pos = (await orderForPos(shopA, order.id))!;
    expect(pos.customer.id).toBe(buyer);
    expect(pos.lines).toEqual([expect.objectContaining({ productId: cement, quantity: "2" })]);

    const sale = await createSale(shopA, cashier, {
      items: pos.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      payments: { ...noPay, cash: "130 000" },
      customerId: buyer,
      orderId: order.id,
    });
    const done = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(done).toMatchObject({ status: "DONE", saleId: sale.id });
    await expect(
      createSale(shopA, cashier, {
        items: pos.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        payments: { ...noPay, cash: "130 000" },
        orderId: order.id,
      }),
    ).rejects.toThrow(uz.orders.notOpen);
    await expect(setOrderStatus(shopA, order.id, "CANCELLED")).rejects.toThrow(uz.orders.notOpen);
  });

  it("buyurtma raqamlari ketma-ket, bo'sh savatcha yuborilmaydi", async () => {
    await expect(submitDraft(shopA, buyer)).rejects.toThrow(uz.bot.cartEmpty);
    await changeDraftItem(shopA, buyer, paint, 1);
    const second = await submitDraft(shopA, buyer);
    expect(second.number).toBe(2);
    await changeDraftItem(shopB, buyerB, productB, 1);
    expect((await submitDraft(shopB, buyerB)).number).toBe(1);
  });
});
