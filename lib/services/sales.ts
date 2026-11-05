import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { t, uz } from "@/lib/i18n/uz";
import { enabledModules } from "@/lib/modules";
import { saleSchema, type SaleInput } from "@/lib/validation/sale";
import { getAccountBalances, lockCustomer } from "./customers";
import { assertSubscriptionActive } from "./companies";
import { ServiceError } from "./errors";
import { formatQuantity } from "./format";
import { getBalances } from "./stock";
import { buildLines } from "./sale-lines";
import { calcTotals, discountError, masterBonus, percentOf, settlePayments } from "./sale-math";

/**
 * Sotuvni bitta tranzaksiyada saqlaydi: chek raqami, qatorlar, to'lovlar va ombor harakatlari
 * (har qator uchun manfiy StockMovement). Biror qadam xato bo'lsa — hech narsa saqlanmaydi.
 */
export async function createSale(tenantId: string, userId: string, input: SaleInput) {
  const data = saleSchema.parse(input);
  await assertSubscriptionActive(tenantId);

  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { modulesOff: true, cashbackPercent: true, allowNegativeStock: true },
    });
    const modules = enabledModules(tenant.modulesOff);
    if ((data.customerId || data.masterId) && !modules.has("customers")) {
      throw new ServiceError(uz.modules.off, "payments");
    }
    if (data.payments.points > 0 && !modules.has("marketing")) {
      throw new ServiceError(uz.modules.off, "payments");
    }

    let priceOverrides = new Map<string, number>();
    if (data.estimateId) {
      const estimate = await tx.estimate.findFirst({
        where: { id: data.estimateId, tenantId },
        include: { items: { select: { productId: true, price: true } } },
      });
      if (!estimate || estimate.status !== "OPEN") throw new ServiceError(uz.pos.estimateNotOpen);
      priceOverrides = new Map(estimate.items.map((i) => [i.productId, i.price]));
    }

    const lines = await buildLines(tx, tenantId, data.items, priceOverrides);

    // Do'kon sozlamasi: qoldiqdan ortiq sotish taqiqlangan bo'lsa (sukut — ruxsat, pilot qarori)
    if (!tenant.allowNegativeStock) {
      const need = new Map<string, Decimal>();
      for (const l of lines)
        need.set(l.productId, (need.get(l.productId) ?? new Decimal(0)).plus(l.quantity));
      const balances = await getBalances(tenantId, [...need.keys()], tx);
      for (const [index, l] of lines.entries()) {
        const stock = balances.get(l.productId) ?? new Decimal(0);
        if (need.get(l.productId)!.gt(stock)) {
          throw new ServiceError(
            t(uz.settings.notEnoughStock, {
              name: l.name,
              stock: formatQuantity(stock.toString()),
            }),
            `items.${index}`,
          );
        }
      }
    }
    const totals = calcTotals(
      lines.map((l) => l.total),
      data.discount,
    );
    const discountProblem = discountError(totals.discount, totals.subtotal);
    if (discountProblem) throw new ServiceError(discountProblem, "discount");

    const settlement = settlePayments(totals.total, data.payments);
    if (!settlement.ok) throw new ServiceError(settlement.error, "payments");
    const debt = data.payments.debt;
    const points = data.payments.points;

    // Nasiya va ball: mijoz majburiy; limit va ball qoldig'i tekshiriladi (mijoz qatori qulflanadi)
    if (debt > 0 && !data.customerId) {
      throw new ServiceError(uz.customers.customerRequired, "payments");
    }
    if (points > 0 && !data.customerId) {
      throw new ServiceError(uz.promotions.pointsNeedCustomer, "payments");
    }
    if (data.customerId) {
      const customer = await lockCustomer(tx, tenantId, data.customerId);
      if ((debt > 0 && customer.creditLimit !== null) || points > 0) {
        const current = (await getAccountBalances(tenantId, [customer.id], tx)).get(customer.id)!;
        if (
          debt > 0 &&
          customer.creditLimit !== null &&
          current.debt + debt > customer.creditLimit
        ) {
          throw new ServiceError(uz.customers.creditLimitExceeded, "payments");
        }
        if (points > current.points)
          throw new ServiceError(uz.promotions.pointsTooMany, "payments");
      }
    }

    // Usta: shu do'konniki va usta belgisi bor bo'lishi shart
    let bonus = 0;
    if (data.masterId) {
      const master = await tx.customer.findFirst({
        where: { id: data.masterId, tenantId, isActive: true, isMaster: true },
        select: { bonusPercent: true },
      });
      if (!master) throw new ServiceError(uz.customers.notMaster, "masterId");
      bonus = masterBonus(totals.total, master.bonusPercent?.toString() ?? 0);
    }

    // Qatorni qulflab raqamni oshiradi — bir vaqtda ikki kassada ham raqamlar takrorlanmaydi
    const { lastSaleNumber } = await tx.tenant.update({
      where: { id: tenantId },
      data: { lastSaleNumber: { increment: 1 } },
      select: { lastSaleNumber: true },
    });

    const sale = await tx.sale.create({
      data: {
        tenantId,
        number: lastSaleNumber,
        cashierId: userId,
        estimateId: data.estimateId,
        customerId: data.customerId,
        masterId: data.masterId,
        ...totals,
        cashReceived: settlement.cashReceived,
        change: settlement.change,
        payments: { create: settlement.payments.map((p) => ({ ...p, tenantId })) },
      },
      select: { id: true, number: true },
    });

    for (const line of lines) {
      const item = await tx.saleItem.create({
        data: { tenantId, saleId: sale.id, ...line, quantity: line.quantity.toString() },
        select: { id: true },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: line.productId,
          type: "SALE",
          quantity: line.quantity.neg().toString(),
          saleItemId: item.id,
          userId,
        },
      });
    }

    if (debt > 0) {
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          customerId: data.customerId!,
          account: "DEBT",
          type: "SALE",
          amount: debt,
          saleId: sale.id,
          dueDate: data.dueDate,
          userId,
        },
      });
    }
    if (bonus > 0) {
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          customerId: data.masterId!,
          account: "BONUS",
          type: "ACCRUAL",
          amount: bonus,
          saleId: sale.id,
          userId,
        },
      });
    }

    if (data.estimateId) {
      const { count } = await tx.estimate.updateMany({
        where: { id: data.estimateId, tenantId, status: "OPEN" },
        data: { status: "CONVERTED" },
      });
      if (count !== 1) throw new ServiceError(uz.pos.estimateNotOpen);
    }

    // Bonus ballari: ishlatilgani ayiriladi; to'langan pul (balldan tashqari) uchun keshbek yoziladi
    if (points > 0) {
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          customerId: data.customerId!,
          account: "POINTS",
          type: "REDEEM",
          amount: -points,
          method: "POINTS",
          saleId: sale.id,
          userId,
        },
      });
    }
    let earned = 0;
    if (data.customerId && modules.has("marketing")) {
      earned = percentOf(totals.total - points, tenant.cashbackPercent?.toString());
      if (earned > 0) {
        await tx.ledgerEntry.create({
          data: {
            tenantId,
            customerId: data.customerId,
            account: "POINTS",
            type: "EARN",
            amount: earned,
            saleId: sale.id,
            userId,
          },
        });
      }
    }

    if (data.orderId) {
      const { count } = await tx.order.updateMany({
        where: { id: data.orderId, tenantId, status: { in: ["NEW", "ACCEPTED", "READY"] } },
        data: { status: "DONE", saleId: sale.id },
      });
      if (count !== 1) throw new ServiceError(uz.orders.notOpen);
    }

    return { ...sale, earned };
  });
}

/** Sotuvlar ro'yxati (filial filtri bilan). */
export async function listSales(tenantId: string, branchId?: string | null, from?: string | null, to?: string | null) {
  const where: Prisma.SaleWhereInput = { tenantId };
  if (branchId) where.branchId = branchId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  return db.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      cashier: { select: { name: true } },
      payments: true,
      returns: { select: { total: true } },
    },
  });
}

/** Smetalar ro'yxati. */
export async function listEstimates(tenantId: string, branchId?: string | null, from?: string | null, to?: string | null) {
  const where: Prisma.EstimateWhereInput = { tenantId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  return db.estimate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getEstimate(tenantId: string, id: string) {
  return db.estimate.findFirst({
    where: { id, tenantId },
    include: { items: { orderBy: { id: "asc" } }, createdBy: { select: { name: true } } },
  });
}

export async function getSale(tenantId: string, id: string) {
  return db.sale.findFirst({
    where: { id, tenantId },
    include: {
      items: { orderBy: { id: "asc" } },
      payments: true,
      cashier: { select: { name: true } },
      estimate: { select: { number: true } },
      tenant: { select: { name: true, address: true, phone: true } },
      customer: { select: { id: true, name: true, phone: true } },
      ledgerEntries: { where: { account: "DEBT" }, select: { dueDate: true } },
    },
  });
}

/** Kassadagi tezkor qidiruv: sotuvlar va smetalar. */
export async function searchSalesForPos(tenantId: string, query: string) {
  const sales = await db.sale.findMany({
    where: {
      tenantId,
      OR: [{ number: { equals: parseInt(query, 10) } }, { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: { take: 1, select: { name: true, quantity: true } } },
  });
  const estimates = await db.estimate.findMany({
    where: { tenantId, status: "OPEN", OR: [{ number: { equals: parseInt(query, 10) } }, { customerName: { contains: query, mode: "insensitive" } }] },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return { sales, estimates };
}

export async function searchEstimatesForPos(tenantId: string, query: string) {
  return db.estimate.findMany({
    where: { tenantId, status: "OPEN", OR: [{ number: { equals: parseInt(query, 10) } }, { customerName: { contains: query, mode: "insensitive" } }] },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** O'zbekistonda yozgi vaqt yo'q, har doim UTC+5. */
export function tashkentDayRange(day: Date) {
  const local = new Date(day.getTime() + TASHKENT_OFFSET_MS);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const from = new Date(startLocal - TASHKENT_OFFSET_MS);
  return { from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
}

/** Kundalik hisobot uchun sotuvlar va qaytarishlar. */
export async function listSalesForDay(tenantId: string, day: Date = new Date()) {
  const { from, to } = tashkentDayRange(day);
  return db.sale.findMany({
    where: { tenantId, createdAt: { gte: from, lt: to } },
    orderBy: { number: "desc" },
    include: {
      cashier: { select: { name: true } },
      payments: true,
      returns: { select: { total: true } },
    },
  });
}

export async function listReturnsForDay(tenantId: string, day: Date = new Date()) {
  const { from, to } = tashkentDayRange(day);
  return db.saleReturn.findMany({
    where: { tenantId, createdAt: { gte: from, lt: to } },
    orderBy: { number: "desc" },
    include: { user: { select: { name: true } }, sale: { select: { id: true, number: true } } },
  });
}
