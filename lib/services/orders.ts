import type { OrderStatus, Unit } from "@prisma/client";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { ServiceError } from "./errors";
import { activePromoPercents } from "./promotions";

export const OPEN_STATUSES: OrderStatus[] = ["NEW", "ACCEPTED", "READY"];

/** Bot katalogidagi bir sahifadagi mahsulotlar soni */
const PAGE_SIZE = 20;

export async function newOrdersCount(tenantId: string) {
  const r = await db.order.aggregate({
    where: { tenantId, status: { in: OPEN_STATUSES } },
    _count: true,
  });
  return r._count;
}

const ORDER_STATUSES: OrderStatus[] = ["DRAFT", "NEW", "ACCEPTED", "READY", "DONE", "CANCELLED"];
function castStatus(value: string): OrderStatus {
  if (!(ORDER_STATUSES as string[]).includes(value)) throw new Error(`Invalid order status: ${value}`);
  return value as OrderStatus;
}

function orderWhere(
  tenantId: string,
  status?: string | null,
  branchId?: string | null,
): NonNullable<Parameters<typeof db.order.findMany>[0]>["where"] {
  return {
    tenantId,
    ...(status === "open"
      ? { status: { in: OPEN_STATUSES } }
      : status === "all"
        ? undefined
        : status != null
          ? { status: castStatus(status) }
          : undefined),
    ...(branchId ? { sale: { branchId } } : {}),
  };
}

export async function listOrders(tenantId: string, status?: string | null, branchId?: string | null) {
  return db.order.findMany({
    where: orderWhere(tenantId, status, branchId),
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { orderBy: { name: "asc" } },
      sale: { select: { id: true, number: true } },
    },
  });
}

// `listOrders` include diqqat bilan ishlatilishi kerak: boshqa joylarda faqat raqam/qisqacha ma'lumot kerak.
// Customer ma'lumoti kerakli joylar:
//   - /pos/orders: ochirish, mijoz raqami
//   - /pos/orders/[id]: batafsil (getOrder)
//   - admin/orders: batafsil (getOrder)
export async function listOrdersWithCustomer(tenantId: string, status?: string | null, branchId?: string | null) {
  return listOrders(tenantId, status, branchId);
}

export async function getOrder(tenantId: string, id: string) {
  return db.order.findFirst({
    where: { id, tenantId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { orderBy: { name: "asc" } },
      sale: { select: { id: true, number: true } },
    },
  });
}

/** Kassaga yuklash uchun: buyurtma qatorlari savatcha ko'rinishida. Boshqa do'konniki — null. */
export async function orderForPos(tenantId: string, id: string) {
  const order = await db.order.findFirst({
    where: { id, tenantId },
    include: {
      customer: { select: { id: true, name: true, phone: true, creditLimit: true } },
      items: { orderBy: { name: "asc" } },
    },
  });
  if (!order || ![...OPEN_STATUSES, "DONE"].includes(order.status)) return null;
  const debt = await db.ledgerEntry.aggregate({
    where: { tenantId, customerId: order.customerId, account: "DEBT" },
    _sum: { amount: true },
  });
  return {
    id: order.id,
    number: order.number ?? 0,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      phone: order.customer.phone,
      debt: debt._sum.amount ?? 0,
      creditLimit: order.customer.creditLimit,
    },
    lines: order.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      unit: i.unit,
      price: i.price,
      quantity: String(i.quantity),
    })),
  };
}

const OPEN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["READY", "CANCELLED"],
  READY: ["CANCELLED"],
};

export async function updateOrderStatus(tenantId: string, id: string, input: { status?: string; note?: string }) {
  const { status } = input ?? {};
  return db.order.updateMany({
    where: { id, tenantId },
    data: { ...(status ? { status: castStatus(status) } : {}), ...(input.note ? { note: input.note } : {}) },
  });
}

/** Holat o'tishlari faqat NEW → ACCEPTED → READY (yoki CANCELLED); DONE/CANCELLED yakuniy. */
export async function setOrderStatus(tenantId: string, id: string, status: string) {
  const current = await db.order.findFirst({
    where: { id, tenantId },
    select: { status: true },
  });
  const next = castStatus(status);
  if (!current || !(OPEN_TRANSITIONS[current.status] ?? []).includes(next)) {
    throw new ServiceError(uz.orders.notOpen);
  }
  return db.order.update({
    where: { id, tenantId },
    data: { status: next },
    include: {
      customer: { select: { id: true, name: true, phone: true, telegramChatId: true } },
      items: { orderBy: { name: "asc" } },
      sale: { select: { id: true, number: true } },
      tenant: { select: { name: true, address: true, phone: true } },
    },
  });
}

// ====== Bot katalogi va savatcha (DRAFT buyurtma) ======

export type BotShop = { id: string; tenantId: string; tenant: { name: string } };

function shopSelect() {
  return { id: true, tenantId: true, tenant: { select: { name: true } } } as const;
}

/** Telegram chatga bog'langan mijozlar — har biri bitta do'kon mijozi. */
export async function customerShopsByChatId(chatId: string): Promise<BotShop[]> {
  if (!chatId) return [];
  return db.customer.findMany({
    where: { telegramChatId: chatId, isActive: true },
    select: shopSelect(),
    orderBy: { createdAt: "asc" },
  });
}

/** Tugmadagi mijoz ID shu chatniki ekani qayta tekshiriladi. */
export async function orderCustomer(chatId: string, customerId: string): Promise<BotShop | null> {
  return db.customer.findFirst({
    where: { id: customerId, telegramChatId: chatId, isActive: true },
    select: shopSelect(),
  });
}

export async function catalogCategories(tenantId: string) {
  const [categories, uncategorizedCount] = await Promise.all([
    db.category.findMany({
      where: { tenantId, products: { some: { isActive: true } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.product.count({ where: { tenantId, isActive: true, categoryId: null } }),
  ]);
  return { categories, uncategorized: uncategorizedCount > 0 };
}

export async function catalogProducts(tenantId: string, categoryId: string | null, page = 0) {
  const where = { tenantId, isActive: true, ...(categoryId ? { categoryId } : {}) };
  const [count, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: { id: true, name: true, unit: true, salePrice: true, categoryId: true },
      orderBy: { name: "asc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const percents = await activePromoPercents(
    tenantId,
    products.map((p) => ({ id: p.id, categoryId: p.categoryId })),
  );
  const items = products.map((p) => {
    const pct = percents.get(p.id);
    return {
      id: p.id,
      name: p.name,
      unit: p.unit,
      salePrice: p.salePrice,
      promoPercent: pct ? pct.toNumber() : null,
    };
  });
  let category: string | null = null;
  if (categoryId) {
    const c = await db.category.findFirst({ where: { id: categoryId, tenantId }, select: { name: true } });
    category = c?.name ?? null;
  }
  return { items, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)), category };
}

export async function productCategoryId(tenantId: string, productId: string) {
  const p = await db.product.findFirst({
    where: { id: productId, tenantId },
    select: { categoryId: true },
  });
  return p?.categoryId ?? null;
}

function draftSelect() {
  return {
    id: true,
    total: true,
    items: { select: { productId: true, name: true, unit: true, price: true, quantity: true } },
  } as const;
}

export type DraftItem = {
  productId: string;
  name: string;
  unit: Unit;
  price: number;
  quantity: string;
  total: number;
};

/** Mijozning savatchasi (DRAFT buyurtma). Bo'sh bo'lsa — null. */
export async function getDraft(tenantId: string, customerId: string) {
  const draft = await db.order.findFirst({
    where: { tenantId, customerId, status: "DRAFT" },
    select: draftSelect(),
  });
  if (!draft) return null;
  const items: DraftItem[] = draft.items
    .map((i) => ({
      productId: i.productId,
      name: i.name,
      unit: i.unit,
      price: i.price,
      quantity: String(i.quantity),
      total: i.price * Number(i.quantity),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { id: draft.id, items, total: items.reduce((s, i) => s + i.total, 0) };
}

async function draftOrCreate(tenantId: string, customerId: string) {
  const existing = await db.order.findFirst({
    where: { tenantId, customerId, status: "DRAFT" },
    select: { id: true },
  });
  if (existing) return existing;
  return db.order.create({ data: { tenantId, customerId, status: "DRAFT" }, select: { id: true } });
}

/** Savatchaga ±1 (yoki ko'proq). 0 bo'lsa — qator o'chadi. Narx doim mahsulotnikiga yangilanadi. */
export async function changeDraftItem(tenantId: string, customerId: string, productId: string, delta: number) {
  const product = await db.product.findFirst({
    where: { id: productId, tenantId, isActive: true },
    select: { id: true, name: true, unit: true, salePrice: true },
  });
  if (!product) throw new ServiceError(uz.pos.productUnavailable, "productId");

  const draft = await draftOrCreate(tenantId, customerId);
  const existing = await db.orderItem.findUnique({
    where: { orderId_productId: { orderId: draft.id, productId } },
    select: { id: true, quantity: true },
  });
  const quantity = Number(existing?.quantity ?? 0) + delta;
  if (quantity <= 0) {
    if (existing) await db.orderItem.delete({ where: { id: existing.id } });
    return { name: product.name, quantity: 0 };
  }
  await db.orderItem.upsert({
    where: { orderId_productId: { orderId: draft.id, productId } },
    create: {
      orderId: draft.id,
      productId,
      name: product.name,
      unit: product.unit,
      price: product.salePrice,
      quantity,
    },
    update: { name: product.name, unit: product.unit, price: product.salePrice, quantity },
  });
  return { name: product.name, quantity };
}

export async function clearDraft(tenantId: string, customerId: string) {
  await db.order.deleteMany({ where: { tenantId, customerId, status: "DRAFT" } });
}

async function nextOrderNumber(tenantId: string) {
  const last = await db.order.findFirst({
    where: { tenantId, number: { not: null } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

/** Savatchani buyurtmaga aylantirish: narxlar yuborilish paytidagidek qayta hisoblanadi,
 * arxivlangan mahsulotlar tushib qoladi. Mijozga va xodimlarga xabar keyin yuboriladi. */
export async function submitDraft(tenantId: string, customerId: string) {
  const draft = await db.order.findFirst({
    where: { tenantId, customerId, status: "DRAFT" },
    include: { items: { select: { id: true, productId: true, quantity: true } } },
  });
  if (!draft || draft.items.length === 0) throw new ServiceError(uz.bot.cartEmpty);

  const products = await db.product.findMany({
    where: { id: { in: draft.items.map((i) => i.productId) }, tenantId },
    select: { id: true, name: true, unit: true, salePrice: true, isActive: true },
  });
  const kept = draft.items.flatMap((i) => {
    const p = products.find((x) => x.id === i.productId);
    if (!p || !p.isActive) return [];
    return [{ ...i, name: p.name, unit: p.unit, price: p.salePrice }];
  });
  if (kept.length === 0) throw new ServiceError(uz.bot.cartEmpty);

  const total = kept.reduce((s, l) => s + l.price * Number(l.quantity), 0);
  const number = await nextOrderNumber(tenantId);

  const order = await db.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({
      where: { orderId: draft.id, productId: { in: draft.items.map((i) => i.productId).filter((id) => !kept.some((k) => k.productId === id)) } },
    });
    for (const l of kept) {
      await tx.orderItem.update({
        where: { id: l.id },
        data: { name: l.name, unit: l.unit, price: l.price, quantity: Number(l.quantity) },
      });
    }
    return tx.order.update({
      where: { id: draft.id },
      data: { status: "NEW", submittedAt: new Date(), number, total },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { orderBy: { name: "asc" } },
      },
    });
  });

  return {
    id: order.id,
    number: order.number,
    total: order.total,
    customer: order.customer,
    lines: order.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      unit: i.unit,
      quantity: String(i.quantity),
      total: i.price * Number(i.quantity),
    })),
  };
}

/** Mijozning yuborilgan buyurtmalari (savatchasiz). */
export async function customerOrders(customerIds: string[]) {
  if (!customerIds.length) return [];
  return db.order.findMany({
    where: { customerId: { in: customerIds }, status: { not: "DRAFT" } },
    select: {
      number: true,
      status: true,
      total: true,
      submittedAt: true,
      tenant: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 20,
  });
}

/** Mijozning xarid cheklari. */
export async function customerPurchases(customerIds: string[]) {
  if (!customerIds.length) return [];
  return db.sale.findMany({
    where: { customerId: { in: customerIds } },
    select: {
      number: true,
      total: true,
      createdAt: true,
      tenant: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/** Yangi buyurtma haqida xabar oladigan xodimlar chat'lari. */
export async function orderStaffChatIds(tenantId: string) {
  const staff = await db.user.findMany({
    where: { tenantId, isActive: true, telegramChatId: { not: null }, telegramReports: true },
    select: { telegramChatId: true },
  });
  return staff.map((s) => s.telegramChatId as string);
}
