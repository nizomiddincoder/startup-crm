import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { productSchema, type ProductInput } from "@/lib/validation/product";
import { isUniqueViolation, ServiceError } from "./errors";
import { withPromoPrices } from "./promotions";
import { getBalances } from "./stock";

/** Ro'yxatda bir martada ko'rsatiladigan maksimal mahsulot soni (qolganini qidiruv topadi). */
export const PRODUCT_LIST_LIMIT = 200;

export type ProductFilter = {
  search?: string;
  categoryId?: string;
  includeArchived?: boolean;
};

export async function listProducts(tenantId: string, filter: ProductFilter = {}) {
  const search = filter.search?.trim();
  const where: Prisma.ProductWhereInput = {
    tenantId,
    ...(filter.includeArchived ? {} : { isActive: true }),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { barcode: { equals: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: PRODUCT_LIST_LIMIT,
      include: { category: { select: { id: true, name: true } } },
    }),
    db.product.count({ where }),
  ]);
  return { items, total };
}

export async function getProduct(tenantId: string, id: string) {
  return db.product.findFirst({ where: { id, tenantId } });
}

/** Kassada skaner uchun: faqat faol mahsulot. */
export async function findProductByBarcode(tenantId: string, barcode: string) {
  return db.product.findFirst({ where: { tenantId, barcode: barcode.trim(), isActive: true } });
}

/** Kassadagi "Ko'p sotiladigan" — avtomatik kategoriya (haqiqiy kategoriya ID'si bo'la olmaydi). */
export const TOP_SELLERS = "__top";
const TOP_SELLERS_DAYS = 30;

/**
 * Oxirgi 30 kunda eng ko'p cheklarda uchragan faol mahsulotlar (birliklar har xil — metr va qopni
 * qo'shib bo'lmaydi, shuning uchun miqdor emas, sotuvlar soni bo'yicha).
 */
export async function topSellingProductsForPos(tenantId: string, limit = 24, now = new Date()) {
  const since = new Date(now.getTime() - TOP_SELLERS_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db.saleItem.groupBy({
    by: ["productId"],
    where: { tenantId, sale: { createdAt: { gte: since } }, product: { isActive: true } },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit,
  });
  const ids = rows.map((r) => r.productId);
  if (ids.length === 0) return [];
  const products = await db.product.findMany({
    where: { tenantId, id: { in: ids }, isActive: true },
    select: {
      id: true,
      name: true,
      unit: true,
      salePrice: true,
      costPrice: true,
      barcode: true,
      imageVersion: true,
      categoryId: true,
    },
  });
  const balances = await getBalances(tenantId, ids);
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p) => p !== undefined);
  return (await withPromoPrices(tenantId, ordered)).map((p) => ({
    ...p,
    stock: balances.get(p.id)?.toString() ?? "0",
  }));
}

/** Kassa ekranidagi mahsulot kartochkalari: kategoriya bo'yicha, qoldiq bilan. */
export async function browseProductsForPos(tenantId: string, categoryId?: string, limit = 60) {
  const products = await db.product.findMany({
    where: { tenantId, isActive: true, ...(categoryId ? { categoryId } : {}) },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      unit: true,
      salePrice: true,
      costPrice: true,
      barcode: true,
      imageVersion: true,
      categoryId: true,
    },
  });
  const balances = await getBalances(
    tenantId,
    products.map((p) => p.id),
  );
  return (await withPromoPrices(tenantId, products)).map((p) => ({
    ...p,
    stock: balances.get(p.id)?.toString() ?? "0",
  }));
}

/** Kassa qidiruvi: faqat faol mahsulotlar, aniq shtrix-kod birinchi bo'lib. */
export async function searchProductsForPos(tenantId: string, query: string) {
  const q = query.trim();
  if (!q) return [];
  const products = await db.product.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [{ barcode: q }, { name: { contains: q, mode: "insensitive" } }],
    },
    orderBy: { name: "asc" },
    take: 20,
    select: {
      id: true,
      name: true,
      unit: true,
      salePrice: true,
      costPrice: true,
      barcode: true,
      imageVersion: true,
      categoryId: true,
    },
  });
  const balances = await getBalances(
    tenantId,
    products.map((p) => p.id),
  );
  return (await withPromoPrices(tenantId, products)).map((p) => ({
    ...p,
    stock: balances.get(p.id)?.toString() ?? "0",
  }));
}

/** Kategoriya shu do'konga tegishli ekanini tekshiradi (boshqa do'kon ID'sini yuborib bo'lmasin). */
async function assertCategoryBelongsToTenant(tenantId: string, categoryId: string | undefined) {
  if (!categoryId) return;
  const exists = await db.category.count({ where: { id: categoryId, tenantId } });
  if (!exists) throw new ServiceError(uz.validation.invalidChoice, "categoryId");
}

function toDbData(data: ReturnType<typeof productSchema.parse>) {
  return {
    name: data.name,
    unit: data.unit,
    salePrice: data.salePrice,
    costPrice: data.costPrice ?? null,
    barcode: data.barcode ?? null,
    categoryId: data.categoryId ?? null,
    minStock: data.minStock ?? null,
  };
}

function rethrowBarcode(error: unknown): never {
  if (isUniqueViolation(error)) throw new ServiceError(uz.products.barcodeTaken, "barcode");
  throw error;
}

export async function createProduct(tenantId: string, input: ProductInput) {
  const data = productSchema.parse(input);
  await assertCategoryBelongsToTenant(tenantId, data.categoryId);
  try {
    return await db.product.create({ data: { tenantId, ...toDbData(data) } });
  } catch (error) {
    rethrowBarcode(error);
  }
}

export async function updateProduct(tenantId: string, id: string, input: ProductInput) {
  const data = productSchema.parse(input);
  await assertCategoryBelongsToTenant(tenantId, data.categoryId);
  try {
    const { count } = await db.product.updateMany({
      where: { id, tenantId },
      data: toDbData(data),
    });
    if (count === 0) throw new ServiceError(uz.products.notFound);
  } catch (error) {
    rethrowBarcode(error);
  }
}

export async function setProductActive(tenantId: string, id: string, isActive: boolean) {
  const { count } = await db.product.updateMany({ where: { id, tenantId }, data: { isActive } });
  if (count === 0) throw new ServiceError(uz.products.notFound);
}
