import type { EstimateStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { estimateSchema, type EstimateInput } from "@/lib/validation/sale";
import { ServiceError } from "./errors";
import { buildLines } from "./sale-lines";
import { calcTotals, discountError } from "./sale-math";

/** Smeta: narxlar shu paytdagi bazadagi narxlar bo'yicha qotiriladi. */
export async function createEstimate(tenantId: string, userId: string, input: EstimateInput) {
  const data = estimateSchema.parse(input);

  return db.$transaction(async (tx) => {
    const lines = await buildLines(tx, tenantId, data.items);
    const totals = calcTotals(
      lines.map((l) => l.total),
      data.discount,
    );
    const discountProblem = discountError(totals.discount, totals.subtotal);
    if (discountProblem) throw new ServiceError(discountProblem, "discount");

    const { lastEstimateNumber } = await tx.tenant.update({
      where: { id: tenantId },
      data: { lastEstimateNumber: { increment: 1 } },
      select: { lastEstimateNumber: true },
    });

    return tx.estimate.create({
      data: {
        tenantId,
        number: lastEstimateNumber,
        createdById: userId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        note: data.note,
        ...totals,
        items: {
          create: lines.map((l) => ({ ...l, tenantId, quantity: l.quantity.toString() })),
        },
      },
      select: { id: true, number: true },
    });
  });
}

export async function getEstimate(tenantId: string, id: string) {
  return db.estimate.findFirst({
    where: { id, tenantId },
    include: {
      items: { orderBy: { id: "asc" } },
      createdBy: { select: { name: true } },
      sale: { select: { id: true, number: true } },
      tenant: { select: { name: true, address: true, phone: true } },
    },
  });
}

export async function listEstimates(
  tenantId: string,
  filter: { status?: EstimateStatus; search?: string } = {},
) {
  const search = filter.search?.trim();
  const number = search && /^\d+$/.test(search) ? Number(search) : undefined;
  const where: Prisma.EstimateWhereInput = {
    tenantId,
    ...(filter.status ? { status: filter.status } : {}),
    ...(search
      ? {
          OR: [
            ...(number !== undefined ? [{ number }] : []),
            { customerName: { contains: search, mode: "insensitive" } },
            { customerPhone: { contains: search } },
          ],
        }
      : {}),
  };
  return db.estimate.findMany({
    where,
    orderBy: { number: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });
}

export async function cancelEstimate(tenantId: string, id: string) {
  const { count } = await db.estimate.updateMany({
    where: { id, tenantId, status: "OPEN" },
    data: { status: "CANCELLED" },
  });
  if (count === 0) throw new ServiceError(uz.pos.estimateNotOpen);
}

/** Smetani kassa savatchasiga yuklash uchun (faqat ochiq smeta). */
export async function getEstimateForPos(tenantId: string, id: string) {
  const estimate = await db.estimate.findFirst({
    where: { id, tenantId, status: "OPEN" },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!estimate) return null;
  return {
    id: estimate.id,
    number: estimate.number,
    discount: estimate.discount,
    items: estimate.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      unit: i.unit,
      price: i.price,
      quantity: i.quantity.toString(),
    })),
  };
}
