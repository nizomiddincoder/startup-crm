import { db } from "@/lib/db";

export const OPEN_STATUSES = ["NEW", "ACCEPTED", "READY"] as const;

export async function newOrdersCount(tenantId: string) {
  const r = await db.order.aggregate({
    where: { tenantId, status: { in: OPEN_STATUSES } },
    _count: true,
  });
  return r._count;
}

type OrderStatus = Parameters<typeof db.order.updateMany>[0]["data"]["status"];

export async function listOrders(tenantId: string, status?: string | null, branchId?: string | null) {
  return db.order.findMany({
    where: {
      tenantId,
      ...(status === "open"
        ? { status: { in: OPEN_STATUSES } }
        : status === "all"
          ? undefined
          : status != null
            ? { status: castStatus(status) }
            : undefined),
      ...(branchId ? { sale: { branchId: branchId ?? undefined } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { orderBy: { id: "asc" } },
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
  return db.order.findMany({
    where: {
      tenantId,
      ...(status === "open"
        ? { status: { in: OPEN_STATUSES } }
        : status === "all"
          ? undefined
          : status != null
            ? { status: castStatus(status) }
            : undefined),
      ...(branchId ? { sale: { branchId: branchId ?? undefined } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { orderBy: { id: "asc" } },
      sale: { select: { id: true, number: true } },
    },
  });
}

export async function getOrder(tenantId: string, id: string) {
  return db.order.findFirst({
    where: { id, tenantId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { orderBy: { id: "asc" } },
      sale: { select: { id: true, number: true } },
    },
  });
}

export async function orderForPos(tenantId: string, id: string) {
  const order = await db.order.findFirst({
    where: { id, tenantId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { orderBy: { id: "asc" } },
      sale: { select: { id: true, number: true } },
    },
  });
  if (!order || ![...OPEN_STATUSES, "DONE"].includes(order.status)) return null;
  return order;
}

export async function updateOrderStatus(tenantId: string, id: string, input: { status?: string; note?: string }) {
  const { status } = input ?? {};
  return db.order.updateMany({
    where: { id, tenantId },
    data: { ...(status ? { status: castStatus(status) } : {}), ...(input.note ? { note: input.note } : {}) },
  });
}

export async function setOrderStatus(tenantId: string, id: string, status: string) {
  const order = await db.order.update({
    where: { id, tenantId },
    data: { status: castStatus(status) },
    include: {
      customer: { select: { id: true, name: true, phone: true, telegramChatId: true } },
      items: { orderBy: { id: "asc" } },
      sale: { select: { id: true, number: true } },
      tenant: { select: { name: true, address: true, phone: true } },
    },
  });
  return order;
}

const ORDER_STATUSES = ["DRAFT", "NEW", "ACCEPTED", "READY", "DONE", "CANCELLED"];
function castStatus(value: string): OrderStatus {
  if (!ORDER_STATUSES.includes(value)) throw new Error(`Invalid order status: ${value}`);
  return value as OrderStatus;
}
