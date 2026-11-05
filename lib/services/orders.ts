import { db } from "@/lib/db";

export async function listOrders(tenantId: string, status?: string | null, branchId?: string | null) {
  return db.order.findMany({
    where: {
      tenantId,
      ...(status ? { status: status as any } : {}),
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

export async function updateOrderStatus(tenantId: string, id: string, input: { status?: string; note?: string }) {
  const { status } = input ?? {};
  return db.order.updateMany({
    where: { id, tenantId },
    data: { ...(status ? { status: status as any } : {}), ...(input.note ? { note: input.note } : {}) },
  });
}
