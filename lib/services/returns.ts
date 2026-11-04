import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { t, uz } from "@/lib/i18n/uz";
import { returnSchema, type ReturnInput } from "@/lib/validation/sale";
import { getAccountBalances, lockCustomer } from "./customers";
import { ServiceError } from "./errors";
import { formatSum } from "./money";
import { bonusReturnAmount, parseQuantity, returnLineAmount } from "./sale-math";

/**
 * Chek bo'yicha qaytarish uchun ma'lumot: har qatorda sotilgan, oldin qaytarilgan va yana
 * qaytarish mumkin bo'lgan miqdor. Sotuv topilmasa — null.
 */
export async function getReturnable(tenantId: string, saleId: string) {
  const sale = await db.sale.findFirst({
    where: { id: saleId, tenantId },
    include: {
      items: { orderBy: { id: "asc" }, include: { returnItems: { select: { quantity: true } } } },
      customer: { select: { id: true, name: true } },
      payments: { select: { method: true, amount: true } },
      returns: {
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          total: true,
          refundMethod: true,
          reason: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!sale) return null;
  const returnedTotal = sale.returns.reduce((s, r) => s + r.total, 0);
  return {
    id: sale.id,
    number: sale.number,
    subtotal: sale.subtotal,
    total: sale.total,
    customer: sale.customer,
    hadDebt: sale.payments.some((p) => p.method === "DEBT"),
    // Ball bilan to'langan qism pul bo'lib qaytarilmaydi
    pointsPaid: sale.payments
      .filter((p) => p.method === "POINTS")
      .reduce((s, p) => s + p.amount, 0),
    returnedTotal,
    returns: sale.returns,
    items: sale.items.map((item) => {
      const returned = item.returnItems.reduce(
        (s, r) => s.plus(r.quantity.toString()),
        new Decimal(0),
      );
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        price: item.price,
        total: item.total,
        quantity: item.quantity.toString(),
        returned: returned.toString(),
        left: new Decimal(item.quantity.toString()).minus(returned).toString(),
      };
    }),
  };
}

/**
 * Qaytarishni bitta tranzaksiyada saqlaydi: qaytarish raqami, qatorlar, omborga kirim (RETURN),
 * nasiyadan ayirish (tanlansa) va usta bonusining mutanosib qismi. Pul — chegirmaga mutanosib.
 */
export async function createReturn(tenantId: string, userId: string, input: ReturnInput) {
  const data = returnSchema.parse(input);

  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: data.saleId, tenantId },
      include: {
        items: { include: { returnItems: { select: { quantity: true } } } },
        returns: { select: { total: true } },
        payments: { where: { method: "POINTS" }, select: { amount: true } },
        ledgerEntries: {
          where: {
            OR: [
              { account: "BONUS", type: "ACCRUAL" },
              { account: "POINTS", type: "EARN" },
            ],
          },
          select: { account: true, amount: true },
        },
      },
    });
    if (!sale) throw new ServiceError(uz.returns.nothingLeft);

    const byId = new Map(sale.items.map((i) => [i.id, i]));
    const lines: { saleItemId: string; productId: string; quantity: Decimal; amount: number }[] =
      [];
    for (const [index, row] of data.items.entries()) {
      if (!row.quantity || row.quantity === "0") continue;
      const item = byId.get(row.saleItemId);
      if (!item) throw new ServiceError(uz.returns.tooMuch, `items.${index}`);
      const q = parseQuantity(row.quantity, item.unit);
      if (!q.ok) throw new ServiceError(q.error, `items.${index}`);
      const returned = item.returnItems.reduce(
        (s, r) => s.plus(r.quantity.toString()),
        new Decimal(0),
      );
      if (q.value.plus(returned).gt(item.quantity.toString())) {
        throw new ServiceError(uz.returns.tooMuch, `items.${index}`);
      }
      lines.push({
        saleItemId: item.id,
        productId: item.productId,
        quantity: q.value,
        amount: returnLineAmount(item, q.value, sale),
      });
    }
    if (lines.length === 0) throw new ServiceError(uz.returns.nothingSelected, "items");

    // Yaxlitlash tufayli jami sotuv summasidan oshib ketmasin. Ball bilan to'langan qism pul
    // bo'lib qaytarilmaydi (aks holda ballni naqdga aylantirib olish mumkin bo'lardi).
    const alreadyReturned = sale.returns.reduce((s, r) => s + r.total, 0);
    const pointsPaid = sale.payments.reduce((s, p) => s + p.amount, 0);
    const total = Math.max(
      Math.min(
        lines.reduce((s, l) => s + l.amount, 0),
        sale.total - pointsPaid - alreadyReturned,
      ),
      0,
    );

    if (data.refundMethod === "DEBT") {
      if (!sale.customerId) throw new ServiceError(uz.returns.debtNeedsCustomer, "refundMethod");
      await lockCustomer(tx, tenantId, sale.customerId);
      const balance = (await getAccountBalances(tenantId, [sale.customerId], tx)).get(
        sale.customerId,
      )!;
      if (balance.debt < total) throw new ServiceError(uz.returns.debtTooSmall, "refundMethod");
    }

    const { lastReturnNumber } = await tx.tenant.update({
      where: { id: tenantId },
      data: { lastReturnNumber: { increment: 1 } },
      select: { lastReturnNumber: true },
    });

    const saleReturn = await tx.saleReturn.create({
      data: {
        tenantId,
        number: lastReturnNumber,
        saleId: sale.id,
        userId,
        total,
        refundMethod: data.refundMethod,
        reason: data.reason,
      },
      select: { id: true, number: true, total: true },
    });

    for (const line of lines) {
      const item = await tx.saleReturnItem.create({
        data: {
          tenantId,
          returnId: saleReturn.id,
          saleItemId: line.saleItemId,
          quantity: line.quantity.toString(),
          amount: line.amount,
        },
        select: { id: true },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: line.productId,
          type: "RETURN",
          quantity: line.quantity.toString(),
          returnItemId: item.id,
          userId,
        },
      });
    }

    if (data.refundMethod === "DEBT") {
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          customerId: sale.customerId!,
          account: "DEBT",
          type: "RETURN",
          amount: -total,
          method: "DEBT",
          saleId: sale.id,
          returnId: saleReturn.id,
          userId,
        },
      });
    }

    // Mijoz keshbegi: qaytarilgan pulga to'g'ri keladigan ballar qaytariladi
    const earned = sale.ledgerEntries
      .filter((e) => e.account === "POINTS")
      .reduce((s, e) => s + e.amount, 0);
    const pointsBack =
      sale.customerId && earned > 0 ? bonusReturnAmount(earned, total, sale.total - pointsPaid) : 0;
    if (pointsBack > 0) {
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          customerId: sale.customerId!,
          account: "POINTS",
          type: "RETURN",
          amount: -pointsBack,
          saleId: sale.id,
          returnId: saleReturn.id,
          userId,
        },
      });
    }

    // Usta bonusi: qaytarilgan qismga to'g'ri keladigan bonus qaytariladi
    const bonus = sale.ledgerEntries
      .filter((e) => e.account === "BONUS")
      .reduce((s, e) => s + e.amount, 0);
    const bonusBack = sale.masterId ? bonusReturnAmount(bonus, total, sale.total) : 0;
    if (bonusBack > 0) {
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          customerId: sale.masterId!,
          account: "BONUS",
          type: "RETURN",
          amount: -bonusBack,
          saleId: sale.id,
          returnId: saleReturn.id,
          userId,
        },
      });
    }

    return saleReturn;
  });
}

export function returnDoneMessage(r: { number: number; total: number }) {
  return t(uz.returns.done, { number: r.number, amount: formatSum(r.total) });
}
