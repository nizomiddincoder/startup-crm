import { db } from "@/lib/db";

export const OPEN_STATUSES = ["NEW", "ACCEPTED", "READY"] as const;

export async function newOrdersCount(tenantId: string) {
  const r = await db.order.aggregate({
    where: { tenantId, status: { in: OPEN_STATUSES } },
    _count: true,
  });
  return r._count;
}

export async function listOrders(tenantId: string, status?: string | null, branchId?: string | null) {
  return db.order.findMany({
    where: {
      tenantId,
      ...(status === "open"
        ? { status: { in: OPEN_STATUSES } }
        : status === "all"
          ? undefined
          : status != null
            ? { status: status as any }
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
    data: { ...(status ? { status: status as any } : {}), ...(input.note ? { note: input.note } : {}) },
  });
}

export async function setOrderStatus(tenantId: string, id: string, status: string) {
  return db.order.update({
    where: { id, tenantId },
    data: { status: status as any },
    include: {
      customer: { select: { id: true, name: true, phone: true, telegramChatId: true } },
      items: { orderBy: { id: "asc" } },
      sale: { select: { id: true, number: true } },
    },
  });
}
