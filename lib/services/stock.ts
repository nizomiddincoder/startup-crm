/**
 * Ombor: qoldiqlar, kirim, hisobdan chiqarish, inventarizatsiya, harakatlar tarixi.
 * QOIDA: qoldiq faqat StockMovement orqali o'zgaradi. Qoldiq = mahsulot harakatlari yig'indisi.
 */
import type { Prisma, StockDocumentType } from "@prisma/client";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import type { UnitValue } from "@/lib/validation/product";
import {
  inventorySchema,
  receiptSchema,
  writeOffSchema,
  type StockDocumentInput,
} from "@/lib/validation/stock";
import { ServiceError } from "./errors";
import { parseQuantity } from "./sale-math";

type Client = Prisma.TransactionClient | typeof db;

/** Mahsulotlar qoldig'i: productId → Decimal. Harakati yo'q mahsulot — 0. */
export async function getBalances(
  tenantId: string,
  productIds?: string[],
  client: Client = db,
): Promise<Map<string, Decimal>> {
  const rows = await client.stockMovement.groupBy({
    by: ["productId"],
    where: { tenantId, ...(productIds ? { productId: { in: productIds } } : {}) },
    _sum: { quantity: true },
  });
  const map = new Map<string, Decimal>();
  for (const id of productIds ?? []) map.set(id, new Decimal(0));
  for (const row of rows) map.set(row.productId, new Decimal(row._sum.quantity?.toString() ?? 0));
  return map;
}

export type StockFilter = { search?: string; categoryId?: string; lowOnly?: boolean };

/** Faol mahsulotlar qoldig'i bilan. `low` — minimal qoldiqdan kam yoki teng, yoki minusda. */
export async function listStock(tenantId: string, filter: StockFilter = {}) {
  const search = filter.search?.trim();
  const products = await db.product.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { barcode: search }] }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      costPrice: true,
      minStock: true,
      category: { select: { name: true } },
    },
  });
  const balances = await getBalances(
    tenantId,
    products.map((p) => p.id),
  );

  const rows = products.map((p) => {
    const balance = balances.get(p.id) ?? new Decimal(0);
    const minStock = p.minStock ? new Decimal(p.minStock.toString()) : null;
    const negative = balance.isNegative();
    const low = negative || (minStock !== null && balance.lte(minStock));
    // Qiymat faqat musbat qoldiq uchun (minus qoldiqning "qiymati" yo'q)
    const value =
      p.costPrice !== null && balance.gt(0)
        ? balance.mul(p.costPrice).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
        : 0;
    return {
      id: p.id,
      name: p.name,
      unit: p.unit,
      category: p.category?.name ?? null,
      costPrice: p.costPrice,
      balance: balance.toString(),
      minStock: minStock?.toString() ?? null,
      low,
      negative,
      value,
    };
  });

  const items = filter.lowOnly ? rows.filter((r) => r.low) : rows;
  return { items, totalValue: items.reduce((sum, r) => sum + r.value, 0) };
}

type DocLine = {
  productId: string;
  name: string;
  unit: UnitValue;
  quantity: Decimal;
  costPrice: number | undefined;
};

async function buildDocLines(
  tx: Prisma.TransactionClient,
  tenantId: string,
  items: { productId: string; quantity: string; costPrice?: number }[],
  allowZero = false,
): Promise<DocLine[]> {
  const ids = items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) throw new ServiceError(uz.warehouse.duplicateLine);

  const products = await tx.product.findMany({
    where: { tenantId, id: { in: ids }, isActive: true },
    select: { id: true, name: true, unit: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return items.map((item, index) => {
    const product = byId.get(item.productId);
    if (!product) throw new ServiceError(uz.pos.productUnavailable, `items.${index}`);
    const q = parseQuantity(item.quantity, product.unit, { allowZero });
    if (!q.ok) throw new ServiceError(q.error, `items.${index}`);
    return { ...product, productId: product.id, quantity: q.value, costPrice: item.costPrice };
  });
}

async function nextDocNumber(tx: Prisma.TransactionClient, tenantId: string) {
  const { lastStockDocNumber } = await tx.tenant.update({
    where: { id: tenantId },
    data: { lastStockDocNumber: { increment: 1 } },
    select: { lastStockDocNumber: true },
  });
  return lastStockDocNumber;
}

/** Kirim: qoldiq oshadi; kelish narxi berilsa — mahsulot kartochkasidagi kelish narxi yangilanadi. */
export async function createReceipt(tenantId: string, userId: string, input: StockDocumentInput) {
  const data = receiptSchema.parse(input);
  return db.$transaction(async (tx) => {
    const lines = await buildDocLines(tx, tenantId, data.items);
    const number = await nextDocNumber(tx, tenantId);
    const doc = await tx.stockDocument.create({
      data: {
        tenantId,
        type: "RECEIPT",
        number,
        supplierName: data.supplierName,
        note: data.note,
        createdById: userId,
      },
      select: { id: true, number: true },
    });
    for (const line of lines) {
      const item = await tx.stockDocumentItem.create({
        data: {
          tenantId,
          documentId: doc.id,
          productId: line.productId,
          quantity: line.quantity.toString(),
          costPrice: line.costPrice,
        },
        select: { id: true },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: line.productId,
          type: "RECEIPT",
          quantity: line.quantity.toString(),
          documentItemId: item.id,
          userId,
        },
      });
      if (line.costPrice !== undefined) {
        await tx.product.updateMany({
          where: { id: line.productId, tenantId },
          data: { costPrice: line.costPrice },
        });
      }
    }
    return doc;
  });
}

/** Hisobdan chiqarish: qoldiq kamayadi, sabab majburiy. */
export async function createWriteOff(tenantId: string, userId: string, input: StockDocumentInput) {
  const data = writeOffSchema.parse(input);
  return db.$transaction(async (tx) => {
    const lines = await buildDocLines(tx, tenantId, data.items);
    const number = await nextDocNumber(tx, tenantId);
    const doc = await tx.stockDocument.create({
      data: { tenantId, type: "WRITE_OFF", number, note: data.note, createdById: userId },
      select: { id: true, number: true },
    });
    for (const line of lines) {
      const item = await tx.stockDocumentItem.create({
        data: {
          tenantId,
          documentId: doc.id,
          productId: line.productId,
          quantity: line.quantity.toString(),
        },
        select: { id: true },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: line.productId,
          type: "WRITE_OFF",
          quantity: line.quantity.neg().toString(),
          documentItemId: item.id,
          userId,
        },
      });
    }
    return doc;
  });
}

/**
 * Inventarizatsiya: sanalgan miqdor tizimdagi qoldiq bilan solishtiriladi va farq
 * ADJUSTMENT harakati sifatida yoziladi. Shundan keyin qoldiq = sanalgan miqdor.
 */
export async function createInventory(tenantId: string, userId: string, input: StockDocumentInput) {
  const data = inventorySchema.parse(input);
  return db.$transaction(async (tx) => {
    const lines = await buildDocLines(tx, tenantId, data.items, true);
    const balances = await getBalances(
      tenantId,
      lines.map((l) => l.productId),
      tx,
    );
    const number = await nextDocNumber(tx, tenantId);
    const doc = await tx.stockDocument.create({
      data: { tenantId, type: "INVENTORY", number, note: data.note, createdById: userId },
      select: { id: true, number: true },
    });
    for (const line of lines) {
      const expected = balances.get(line.productId) ?? new Decimal(0);
      const difference = line.quantity.minus(expected);
      const item = await tx.stockDocumentItem.create({
        data: {
          tenantId,
          documentId: doc.id,
          productId: line.productId,
          quantity: line.quantity.toString(),
          expected: expected.toString(),
        },
        select: { id: true },
      });
      if (!difference.isZero()) {
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: line.productId,
            type: "ADJUSTMENT",
            quantity: difference.toString(),
            documentItemId: item.id,
            userId,
          },
        });
      }
    }
    return doc;
  });
}

export async function listDocuments(tenantId: string, type?: StockDocumentType) {
  return db.stockDocument.findMany({
    where: { tenantId, ...(type ? { type } : {}) },
    orderBy: { number: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } }, _count: { select: { items: true } } },
  });
}

export async function getDocument(tenantId: string, id: string) {
  return db.stockDocument.findFirst({
    where: { id, tenantId },
    include: {
      createdBy: { select: { name: true } },
      items: {
        orderBy: { id: "asc" },
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
  });
}

/** Inventarizatsiya uchun: kategoriyadagi barcha faol mahsulotlar joriy qoldig'i bilan. */
export async function listProductsForCount(tenantId: string, categoryId: string) {
  const products = await db.product.findMany({
    where: { tenantId, isActive: true, categoryId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true, salePrice: true, costPrice: true, barcode: true },
  });
  const balances = await getBalances(
    tenantId,
    products.map((p) => p.id),
  );
  return products.map((p) => ({ ...p, stock: (balances.get(p.id) ?? new Decimal(0)).toString() }));
}

/** Mahsulot harakatlari (eng yangisi birinchi), har biridan keyingi qoldiq bilan. */
export async function getProductMovements(tenantId: string, productId: string, limit = 200) {
  const product = await db.product.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, name: true, unit: true, minStock: true },
  });
  if (!product) return null;

  const movements = await db.stockMovement.findMany({
    where: { tenantId, productId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      user: { select: { name: true } },
      saleItem: { select: { sale: { select: { id: true, number: true } } } },
      // Qaytarish — qaysi chekdan qaytgani ko'rsatiladi
      returnItem: {
        select: { saleItem: { select: { sale: { select: { id: true, number: true } } } } },
      },
      documentItem: { select: { document: { select: { id: true, number: true, type: true } } } },
    },
  });

  let running = new Decimal(0);
  const rows = movements.map((m) => {
    running = running.plus(m.quantity.toString());
    return {
      id: m.id,
      type: m.type,
      createdAt: m.createdAt,
      quantity: m.quantity.toString(),
      balanceAfter: running.toString(),
      user: m.user.name,
      sale: m.saleItem?.sale ?? m.returnItem?.saleItem.sale ?? null,
      document: m.documentItem?.document ?? null,
    };
  });

  return { product, balance: running.toString(), movements: rows.reverse().slice(0, limit) };
}
