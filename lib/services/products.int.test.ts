/**
 * Integratsiya testlari — haqiqiy bazada ishlaydi. Avval: npm run db:local
 * Ishga tushirish: npm run test:int
 * Har test o'z vaqtinchalik do'konlarini yaratadi va oxirida o'chiradi.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { createCategory, deleteCategory, listCategories, renameCategory } from "./categories";
import { ServiceError } from "./errors";
import {
  createProduct,
  findProductByBarcode,
  getProduct,
  listProducts,
  setProductActive,
  updateProduct,
} from "./products";

const shopA = `test-a-${randomUUID()}`;
const shopB = `test-b-${randomUUID()}`;
const base = { name: "Sement M400", unit: "BAG" as const, salePrice: "62 000" };

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "Test do'kon A" },
      { id: shopB, name: "Test do'kon B" },
    ],
  });
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("mahsulotlar: do'konlar ajratilgan", () => {
  it("bir do'kon boshqasining mahsulotini ko'rmaydi va o'zgartira olmaydi", async () => {
    const product = await createProduct(shopA, { ...base, barcode: "1111000011" });

    expect(await getProduct(shopB, product.id)).toBeNull();
    expect((await listProducts(shopB)).total).toBe(0);
    expect(await findProductByBarcode(shopB, "1111000011")).toBeNull();
    await expect(updateProduct(shopB, product.id, { ...base, name: "O'g'irlik" })).rejects.toThrow(
      ServiceError,
    );
    await expect(setProductActive(shopB, product.id, false)).rejects.toThrow(ServiceError);

    expect((await getProduct(shopA, product.id))?.name).toBe("Sement M400");
  });

  it("boshqa do'konning kategoriyasini biriktirib bo'lmaydi", async () => {
    const foreign = await createCategory(shopB, { name: "B kategoriyasi" });
    await expect(createProduct(shopA, { ...base, categoryId: foreign.id })).rejects.toMatchObject({
      field: "categoryId",
    });
  });

  it("shtrix-kod do'kon ichida yagona, lekin boshqa do'konda takrorlanishi mumkin", async () => {
    await createProduct(shopA, { ...base, barcode: "2222000022" });
    await expect(createProduct(shopA, { ...base, barcode: "2222000022" })).rejects.toMatchObject({
      field: "barcode",
      message: uz.products.barcodeTaken,
    });
    await expect(createProduct(shopB, { ...base, barcode: "2222000022" })).resolves.toBeTruthy();
  });

  it("narxni so'mda butun son sifatida saqlaydi", async () => {
    const product = await createProduct(shopA, { ...base, salePrice: "1 250 000", costPrice: "" });
    expect(product.salePrice).toBe(1250000);
    expect(product.costPrice).toBeNull();
  });
});

describe("mahsulotlar: qidiruv va arxiv", () => {
  it("nomi va shtrix-kodi bo'yicha topadi, arxivdagini yashiradi", async () => {
    const p = await createProduct(shopA, {
      ...base,
      name: "Gipsokarton Knauf",
      barcode: "3333000033",
    });

    expect((await listProducts(shopA, { search: "knauf" })).items.map((x) => x.id)).toContain(p.id);
    expect((await listProducts(shopA, { search: "3333000033" })).items).toHaveLength(1);

    await setProductActive(shopA, p.id, false);
    expect((await listProducts(shopA, { search: "knauf" })).total).toBe(0);
    expect((await listProducts(shopA, { search: "knauf", includeArchived: true })).total).toBe(1);
    expect(await findProductByBarcode(shopA, "3333000033")).toBeNull();
  });
});

describe("kategoriyalar", () => {
  it("takroriy nomni rad etadi, boshqa do'konda esa ruxsat beradi", async () => {
    await createCategory(shopA, { name: "Bo'yoqlar" });
    await expect(createCategory(shopA, { name: "Bo'yoqlar" })).rejects.toMatchObject({
      message: uz.categories.duplicate,
    });
    await expect(createCategory(shopB, { name: "Bo'yoqlar" })).resolves.toBeTruthy();
  });

  it("mahsuloti bor kategoriyani o'chirmaydi", async () => {
    const category = await createCategory(shopA, { name: "Metall" });
    await createProduct(shopA, { ...base, categoryId: category.id });
    await expect(deleteCategory(shopA, category.id)).rejects.toMatchObject({
      message: uz.categories.notEmpty,
    });
  });

  it("boshqa do'konning kategoriyasini o'zgartira va o'chira olmaydi", async () => {
    const category = await createCategory(shopA, { name: "Qum" });
    await expect(renameCategory(shopB, category.id, { name: "Buzildi" })).rejects.toThrow(
      ServiceError,
    );
    await deleteCategory(shopB, category.id);
    const names = (await listCategories(shopA)).map((c) => c.name);
    expect(names).toContain("Qum");
  });
});
