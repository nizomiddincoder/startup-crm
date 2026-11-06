/**
 * Tenant izolyatsiyasi — RLS bilan haqiqiy baza testlari.
 * Isbotlanadi: A kompaniyasi sessiyasi B kompaniya ma'lumotini
 * O'QIY OLMAYDI, YANGILAY OLMAYDI, O'CHIRA OLMAYDI, RO'YXATDA KO'RMAYDI,
 * va B nomidan YOZA OLMAYDI. Asosiy himoya — PostgreSQL RLS (withTenant),
 * qo'shimcha — servis qatlami (tenantId tekshiruvi).
 * Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db-tenant";
import { uz } from "@/lib/i18n/uz";
import { createProduct, updateProduct } from "./products";

const shopA = `test-iso-a-${randomUUID()}`;
const shopB = `test-iso-b-${randomUUID()}`;
let productA: string;
let productB: string;

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "Izolyatsiya A" },
      { id: shopB, name: "Izolyatsiya B" },
    ],
  });
  productA = (
    await createProduct(shopA, { name: "A tovar", unit: "PIECE", salePrice: 1000 })
  ).id;
  productB = (
    await createProduct(shopB, { name: "B tovar", unit: "PIECE", salePrice: 2000 })
  ).id;
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("RLS: A kompaniyasi B ma'lumotiga kira olmaydi", () => {
  it("RO'YXAT: faqat o'z tovarlari ko'rinadi", async () => {
    const names = await withTenant(shopA, (tx) =>
      tx.product.findMany({ select: { id: true } }),
    );
    expect(names.map((p) => p.id)).toEqual([productA]);
  });

  it("O'QISH: B tovarini ID bo'yicha topsa bo'lmaydi", async () => {
    const found = await withTenant(shopA, (tx) =>
      tx.product.findUnique({ where: { id: productB } }),
    );
    expect(found).toBeNull();
  });

  it("YANGILASH: B tovariga updateMany 0 qatorga ta'sir qiladi", async () => {
    const r = await withTenant(shopA, (tx) =>
      tx.product.updateMany({ where: { id: productB }, data: { name: "hack" } }),
    );
    expect(r.count).toBe(0);
    expect((await db.product.findUniqueOrThrow({ where: { id: productB } })).name).toBe(
      "B tovar",
    );
  });

  it("O'CHIRISH: B tovarini deleteMany o'chira olmaydi", async () => {
    const r = await withTenant(shopA, (tx) =>
      tx.product.deleteMany({ where: { id: productB } }),
    );
    expect(r.count).toBe(0);
    expect(await db.product.findUnique({ where: { id: productB } })).not.toBeNull();
  });

  it("YOZISH: B tenantId bilan qator qo'shsa — RLS rad etadi", async () => {
    await expect(
      withTenant(shopA, (tx) =>
        tx.product.create({
          data: { tenantId: shopB, name: "noqonuniy", unit: "PIECE", salePrice: 1 },
        }),
      ),
    ).rejects.toThrow();
  });

  it("tenant_id o'rnatilmagan sessiya HECH NARSANI ko'rmaydi", async () => {
    const rows = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE kassa_app`);
      return tx.product.findMany({ select: { id: true } });
    });
    expect(rows).toEqual([]);
  });
});

describe("Servis qatlami: tenantId doim o'zidan olinadi", () => {
  it("A do'koni B tovarini yangilay olmaydi — notFound", async () => {
    await expect(
      updateProduct(shopA, productB, { name: "x", unit: "PIECE", salePrice: 1 }),
    ).rejects.toThrow(uz.products.notFound);
  });

  it("noto'g'ri tenantId bilan withTenant ishlamaydi", async () => {
    await expect(withTenant("x", () => Promise.resolve(1))).rejects.toThrow();
  });
});
