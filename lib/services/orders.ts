/**
 * Telegram buyurtmalari: mijoz botda katalogdan savatcha (DRAFT) yig'adi → yuboradi (NEW, raqam
 * beriladi) → do'kon qabul qiladi / tayyor / bekor → kassada sotiladi (DONE, `createSale`).
 * Mijoz chat bo'yicha topiladi (`Customer.telegramChatId`); har amal shu chat'ga tegishli mijoz
 * va uning do'koni (tenantId) bilan cheklangan.
 */
import type { OrderStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import type { UnitValue } from "@/lib/validation/product";
import { MAX_LINES } from "@/lib/validation/sale";
import { getAccountBalances } from "./customers";
import { ServiceError } from "./errors";
import { withPromoPrices } from "./promotions";
import { buildLines } from "./sale-lines";
import { lineTotal } from "./sale-math";

/** Botdagi bir sahifadagi mahsulotlar soni. */
export const CATALOG_PAGE = 8;
/** Kassada sotish mumkin bo'lgan (ochiq) holatlar. */
export const OPEN_STATUSES: OrderStatus[] = ["NEW", "ACCEPTED", "READY"];
const MAX_QUANTITY = 100_000;
/** Botda buyurtma: do'kon faol va "Telegram buyurtmalar" (va mijozlar) moduli yoqiq. */
const ordersTenant = {
  isActive: true,
  NOT: { modulesOff: { hasSome: ["orders", "customers"] } },
};

/** Bu chat'ga ulangan, faol mijozlar (har do'konda alohida yozuv). Tenant'siz — bot istisnosi. */
export async function customerShopsByChatId(chatId: string) {
  if (!chatId) return [];
  return db.customer.findMany({
    where: { telegramChatId: chatId, isActive: true, tenant: ordersTenant },
    select: { id: true, tenantId: true, name: true, tenant: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Tugmadagi mijoz ID shu chat'niki ekanini tekshiradi (boshqa odamning savatchasiga kirib bo'lmaydi). */
export async function orderCustomer(chatId: string, customerId: string) {
  if (!chatId) return null;
  return db.customer.findFirst({
    where: {
      id: customerId,
      telegramChatId: chatId,
      isActive: true,
      tenant: ordersTenant,
    },
    select: { id: true, tenantId: true, name: true, tenant: { select: { name: true } } },
  });
}

/** Faol mahsuloti bor kategoriyalar; `uncategorized` — kategoriyasiz mahsulotlar soni. */
export async function catalogCategories(tenantId: string) {
  const [categories, uncategorized] = await Promise.all([
    db.category.findMany({
      where: { tenantId, products: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.product.count({ where: { tenantId, isActive: true, categoryId: null } }),
  ]);
  return { categories, uncategorized };
}

/** Kategoriyadagi mahsulotlar sahifasi (aksiya narxi bilan). `categoryId: null` — kategoriyasiz. */
export async function catalogProducts(tenantId: string, categoryId: string | null, page: number) {
  const where = { tenantId, isActive: true, categoryId };
  const [count, products, category] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: Math.max(page, 0) * CATALOG_PAGE,
      take: CATALOG_PAGE,
      select: { id: true, name: true, unit: true, salePrice: true, categoryId: true },
    }),
    categoryId
      ? db.category.findFirst({ where: { id: categoryId, tenantId }, select: { name: true } })
      : null,
  ]);
  return {
    category: category?.name ?? uz.bot.otherCategory,
    items: await withPromoPrices(tenantId, products),
    page: Math.max(page, 0),
    pages: Math.max(Math.ceil(count / CATALOG_PAGE), 1),
  };
}

/** Bot: mahsulot qo'shilgandan keyin shu kategoriya sahifasini qayta chizish uchun. */
export async function productCategoryId(tenantId: string, productId: string) {
  const p = await db.product.findFirst({
    where: { id: productId, tenantId },
    select: { categoryId: true },
  });
  return p?.categoryId ?? null;
}

async function findDraft(tenantId: string, customerId: string) {
  return db.order.findFirst({
    where: { tenantId, customerId, status: "DRAFT" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

/**
 * Savatchadagi miqdorni `delta`ga o'zgartiradi (+1 / −1). 0 ga tushsa — qator o'chadi.
 * Narx shu paytdagi (aksiya bilan); yuborishda qayta hisoblanadi.
 */
export async function changeDraftItem(
  tenantId: string,
  customerId: string,
  productId: string,
  delta: number,
) {
  const product = await db.product.findFirst({
    where: { id: productId, tenantId, isActive: true },
    select: { id: true, name: true, unit: true, salePrice: true, categoryId: true },
  });
  if (!product) throw new ServiceError(uz.pos.productUnavailable);
  const [priced] = await withPromoPrices(tenantId, [product]);

  const draft =
    (await findDraft(tenantId, customerId)) ??
    (await db.order.create({ data: { tenantId, customerId }, select: { id: true } }));
  const existing = await db.orderItem.findUnique({
    where: { orderId_productId: { orderId: draft.id, productId } },
    select: { quantity: true },
  });
  const next = new Decimal(existing?.quantity.toString() ?? 0).plus(delta);

  if (next.lte(0)) {
    if (existing) {
      await db.orderItem.delete({ where: { orderId_productId: { orderId: draft.id, productId } } });
    }
    return { name: product.name, quantity: "0" };
  }
  if (!existing) {
    const lines = await db.orderItem.count({ where: { orderId: draft.id } });
    if (lines >= MAX_LINES) throw new ServiceError(uz.validation.tooLong);
  }
  const quantity = Decimal.min(next, MAX_QUANTITY).toString();
  await db.orderItem.upsert({
    where: { orderId_productId: { orderId: draft.id, productId } },
    create: {
      orderId: draft.id,
      productId,
      name: product.name,
      unit: product.unit,
      price: priced.salePrice,
      quantity,
    },
    update: { quantity, price: priced.salePrice, name: product.name },
  });
  return { name: product.name, quantity };
}

type PricedItem = { price: number; quantity: { toString(): string } };

/** Qatorlar summasi va jami (miqdor — satr). */
function withTotals<T extends { items: PricedItem[] }>(order: T) {
  type Item = Omit<T["items"][number], "quantity"> & { quantity: string; total: number };
  const items: Item[] = order.items.map((i) => {
    const quantity = new Decimal(i.quantity.toString());
    return { ...i, quantity: quantity.toString(), total: lineTotal(i.price, quantity) } as Item;
  });
  const total = items.reduce((s, i) => s + i.total, 0);
  return { ...order, items, total } as Omit<T, "items"> & { items: Item[]; total: number };
}

/** Mijozning joriy savatchasi (bo'lmasa — null). */
export async function getDraft(tenantId: string, customerId: string) {
  const draft = await db.order.findFirst({
    where: { tenantId, customerId, status: "DRAFT" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      items: {
        orderBy: { name: "asc" },
        select: { productId: true, name: true, unit: true, price: true, quantity: true },
      },
    },
  });
  return draft ? withTotals(draft) : null;
}

export async function clearDraft(tenantId: string, customerId: string) {
  await db.order.deleteMany({ where: { tenantId, customerId, status: "DRAFT" } });
}

/**
 * Savatchani yuboradi: narxlar bazadan qayta olinadi (aksiya bilan), raqam beriladi, holat NEW.
 * Arxivlangan mahsulot savatchadan tushib qoladi. Bo'sh savatcha yuborilmaydi.
 */
export async function submitDraft(tenantId: string, customerId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const draft = await tx.order.findFirst({
      where: { tenantId, customerId, status: "DRAFT" },
      orderBy: { createdAt: "asc" },
      select: { id: true, items: { select: { productId: true, quantity: true } } },
    });
    if (!draft) throw new ServiceError(uz.bot.cartEmpty);

    const active = await tx.product.findMany({
      where: { tenantId, isActive: true, id: { in: draft.items.map((i) => i.productId) } },
      select: { id: true },
    });
    const activeIds = new Set(active.map((p) => p.id));
    const items = draft.items
      .filter((i) => activeIds.has(i.productId))
      .map((i) => ({ productId: i.productId, quantity: i.quantity.toString() }));
    if (items.length === 0) throw new ServiceError(uz.bot.cartEmpty);

    const lines = await buildLines(tx, tenantId, items);
    await tx.orderItem.deleteMany({ where: { orderId: draft.id } });
    await tx.orderItem.createMany({
      data: lines.map((l) => ({
        orderId: draft.id,
        productId: l.productId,
        name: l.name,
        unit: l.unit,
        price: l.price,
        quantity: l.quantity.toString(),
      })),
    });
    const total = lines.reduce((s, l) => s + l.total, 0);

    const { lastOrderNumber } = await tx.tenant.update({
      where: { id: tenantId },
      data: { lastOrderNumber: { increment: 1 } },
      select: { lastOrderNumber: true },
    });
    const { count } = await tx.order.updateMany({
      where: { id: draft.id, tenantId, status: "DRAFT" },
      data: { status: "NEW", number: lastOrderNumber, total, submittedAt: now },
    });
    if (count !== 1) throw new ServiceError(uz.bot.orderExpired);

    const customer = await tx.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
      select: { name: true, phone: true },
    });
    return {
      id: draft.id,
      customer,
      number: lastOrderNumber,
      total,
      lines: lines.map((l) => ({
        name: l.name,
        unit: l.unit,
        quantity: l.quantity.toString(),
        total: l.total,
      })),
    };
  });
}

/** Yangi buyurtma xabari kimga boradi: Telegram'ga ulangan faol egasi va menejerlar. */
export async function orderStaffChatIds(tenantId: string) {
  const staff = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["OWNER", "MANAGER"] },
      telegramChatId: { not: null },
    },
    select: { telegramChatId: true },
  });
  return staff.map((s) => s.telegramChatId!);
}

export async function newOrdersCount(tenantId: string) {
  return db.order.count({ where: { tenantId, status: "NEW" } });
}

/** Dastur ro'yxati: savatchalar (DRAFT) ko'rinmaydi. `open` — sotilmagan va bekor qilinmaganlar. */
export async function listOrders(tenantId: string, filter: "open" | "all" = "open") {
  return db.order.findMany({
    where: {
      tenantId,
      status: filter === "open" ? { in: OPEN_STATUSES } : { not: "DRAFT" },
    },
    orderBy: { submittedAt: "desc" },
    take: 200,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getOrder(tenantId: string, id: string) {
  const order = await db.order.findFirst({
    where: { id, tenantId, status: { not: "DRAFT" } },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      sale: { select: { id: true, number: true } },
      items: { orderBy: { name: "asc" } },
    },
  });
  return order ? withTotals(order) : null;
}

const TRANSITIONS: Record<"ACCEPTED" | "READY" | "CANCELLED", OrderStatus[]> = {
  ACCEPTED: ["NEW"],
  READY: ["NEW", "ACCEPTED"],
  CANCELLED: OPEN_STATUSES,
};

/**
 * Holatni o'zgartiradi (qabul / tayyor / bekor). Mijozga xabar uchun chat va do'kon nomi qaytadi.
 * Sotilgan yoki bekor qilingan buyurtmani o'zgartirib bo'lmaydi.
 */
export async function setOrderStatus(
  tenantId: string,
  id: string,
  status: keyof typeof TRANSITIONS,
  note?: string,
) {
  const { count } = await db.order.updateMany({
    where: { id, tenantId, status: { in: TRANSITIONS[status] } },
    data: { status, ...(note ? { note: note.slice(0, 300) } : {}) },
  });
  if (count !== 1) throw new ServiceError(uz.orders.notOpen);
  return db.order.findFirstOrThrow({
    where: { id, tenantId },
    select: {
      number: true,
      total: true,
      note: true,
      tenant: { select: { name: true } },
      customer: { select: { telegramChatId: true } },
    },
  });
}

/** Kassaga yuklash: savatcha qatorlari (joriy narx bilan) va mijoz. Faqat ochiq buyurtma. */
export async function orderForPos(tenantId: string, id: string) {
  const order = await db.order.findFirst({
    where: { id, tenantId, status: { in: OPEN_STATUSES } },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, creditLimit: true, discountPercent: true },
      },
      items: {
        orderBy: { name: "asc" },
        include: {
          product: {
            select: {
              id: true,
              isActive: true,
              salePrice: true,
              categoryId: true,
              imageVersion: true,
            },
          },
        },
      },
    },
  });
  if (!order) return null;
  const products = order.items.filter((i) => i.product.isActive).map((i) => i.product);
  const priced = new Map((await withPromoPrices(tenantId, products)).map((p) => [p.id, p]));
  const balance = (await getAccountBalances(tenantId, [order.customerId])).get(order.customerId);
  return {
    id: order.id,
    number: order.number ?? 0,
    customer: {
      ...order.customer,
      discountPercent: order.customer.discountPercent?.toString() ?? null,
      debt: balance?.debt ?? 0,
      points: balance?.points ?? 0,
    },
    lines: order.items
      .filter((i) => priced.has(i.productId))
      .map((i) => ({
        productId: i.productId,
        name: i.name,
        unit: i.unit as UnitValue,
        price: priced.get(i.productId)!.salePrice,
        quantity: new Decimal(i.quantity.toString()).toString(),
        imageVersion: i.product.imageVersion,
      })),
  };
}

/** Bot: mijozning oxirgi buyurtmalari (barcha do'konlari). */
export async function customerOrders(customerIds: string[], take = 10) {
  return db.order.findMany({
    where: { customerId: { in: customerIds }, status: { not: "DRAFT" } },
    orderBy: { submittedAt: "desc" },
    take,
    select: {
      number: true,
      total: true,
      status: true,
      submittedAt: true,
      tenant: { select: { name: true } },
    },
  });
}

/** Bot: mijozning oxirgi xaridlari (cheklar). */
export async function customerPurchases(customerIds: string[], take = 10) {
  return db.sale.findMany({
    where: { customerId: { in: customerIds } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      number: true,
      total: true,
      createdAt: true,
      tenant: { select: { name: true } },
    },
  });
}
