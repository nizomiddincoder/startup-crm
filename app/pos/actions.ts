"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { createCustomer, searchCustomers } from "@/lib/services/customers";
import { cancelEstimate, createEstimate } from "@/lib/services/estimates";
import { assertModule } from "@/lib/services/modules";
import { SECTION_ACCESS } from "@/lib/services/permissions";
import {
  browseProductsForPos,
  searchProductsForPos,
  TOP_SELLERS,
  topSellingProductsForPos,
} from "@/lib/services/products";
import { createReturn } from "@/lib/services/returns";
import { createSale } from "@/lib/services/sales";
import { closeShift, openShift } from "@/lib/services/shifts";
import type { EstimateInput, ReturnInput, SaleInput, ShiftCashInput } from "@/lib/validation/sale";

const requireCashier = () => requireUser(SECTION_ACCESS["/pos"]);

export async function searchProductsAction(query: string) {
  const user = await requireCashier();
  return searchProductsForPos(user.tenantId, String(query).slice(0, 100));
}

export async function browseProductsAction(categoryId?: string) {
  const user = await requireCashier();
  if (categoryId === TOP_SELLERS) return topSellingProductsForPos(user.tenantId);
  return browseProductsForPos(user.tenantId, categoryId || undefined);
}

export async function searchCustomersAction(query: string, mastersOnly = false) {
  const user = await requireCashier();
  return searchCustomers(user.tenantId, String(query).slice(0, 100), { mastersOnly });
}

/** Kassadan tezkor mijoz qo'shish (faqat ism va telefon). */
export async function quickCreateCustomerAction(input: { name: string; phone: string }) {
  const user = await requireCashier();
  try {
    const customer = await createCustomer(
      user.tenantId,
      { name: input.name, phone: input.phone },
      false,
    );
    return { ok: true as const, customer: { ...customer, debt: 0 } };
  } catch (error) {
    return { ...toActionState(error), ok: false as const };
  }
}

export type CreatedState = ActionState & { id?: string; number?: number; earned?: number };

export async function createSaleAction(input: SaleInput): Promise<CreatedState> {
  const user = await requireCashier();
  try {
    const sale = await createSale(user.tenantId, user.id, input);
    revalidatePath("/pos/sales");
    if (input.estimateId) revalidatePath("/pos/estimates");
    if (input.orderId) revalidatePath("/pos/orders");
    return { ok: true, id: sale.id, number: sale.number, earned: sale.earned };
  } catch (error) {
    return toActionState(error);
  }
}

export async function createReturnAction(input: ReturnInput): Promise<CreatedState> {
  const user = await requireCashier();
  try {
    const saleReturn = await createReturn(user.tenantId, user.id, input);
    revalidatePath("/pos/sales");
    revalidatePath(`/pos/sales/${input.saleId}`);
    return { ok: true, id: saleReturn.id, number: saleReturn.number };
  } catch (error) {
    return toActionState(error);
  }
}

export async function openShiftAction(input: ShiftCashInput): Promise<ActionState> {
  const user = await requireCashier();
  try {
    await openShift(user.tenantId, user.id, input);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/pos", "layout");
  return { ok: true };
}

export async function closeShiftAction(input: ShiftCashInput): Promise<CreatedState> {
  const user = await requireCashier();
  try {
    const shift = await closeShift(user.tenantId, user.id, input);
    revalidatePath("/pos", "layout");
    return { ok: true, id: shift.id, number: shift.number };
  } catch (error) {
    return toActionState(error);
  }
}

export async function createEstimateAction(input: EstimateInput): Promise<CreatedState> {
  const user = await requireCashier();
  try {
    await assertModule(user.tenantId, "estimates");
    const estimate = await createEstimate(user.tenantId, user.id, input);
    revalidatePath("/pos/estimates");
    return { ok: true, id: estimate.id };
  } catch (error) {
    return toActionState(error);
  }
}

export async function cancelEstimateAction(id: string): Promise<ActionState> {
  const user = await requireCashier();
  try {
    await cancelEstimate(user.tenantId, id);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/pos/estimates");
  revalidatePath(`/pos/estimates/${id}`);
  return { ok: true };
}
