import { db } from "@/lib/db";

export const OPEN_STATUSES = ["NEW", "ACCEPTED", "READY"] as const;

import { Prisma } from "@prisma/client";

type OrderStatus = Prisma.Enum.OrderStatusFieldUpdateOperationsInput["set"];

export async function listOrders(tenantId: string, status?: string | null, branchId?: string | null) {
  return db.order.findMany({
    where: {
      tenantId,
      ...(status === "open"
        ? { status: { in: OPEN_STATUSES } }
        : status === "all"
          ? undefined
          : status != null
            ? { status: castOrderStatus(status) }
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
    data: { ...(status ? { status: castOrderStatus(status) } : {}), ...(input.note ? { note: input.note } : {}) },
  });
}

export async function setOrderStatus(tenantId: string, id: string, status: string) {
  return db.order.update({
    where: { id, tenantId },
    data: { status: castOrderStatus(status) },
    include: {
      customer: { select: { id: true, name: true, phone: true, telegramChatId: true } },
      items: { orderBy: { id: "asc" } },
      sale: { select: { id: true, number: true } },
    },
  });
}

function castOrderStatus(value: string): OrderStatus {
  // Valid statuslar: bazaga murojaat qilish uchun Prisma turkumi bilan moslashtirilgan.
  // Enum qiymatlari string sifatida saqlanadi (% OrderStatus enum fields).
  const validStatuses: Prisma.Enum.OrderStatusFieldUpdateOperationsInput["set"] = [
    "DRAFT",
    "NEW",
    "ACCEPTED",
    "READY",
    "DONE",
    "CANCELLED",
  ];
  if (!validStatuses.includes(value as Prisma.Enum.OrderStatusFieldUpdateOperationsInput["set"])) {
    throw new Error(`Invalid order status: ${value}`);
  }
  return value as Prisma.Enum.OrderStatusFieldUpdateOperationsInput["set"];
}
