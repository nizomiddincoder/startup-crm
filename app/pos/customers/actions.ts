"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import {
  createCustomer,
  payMasterBonus,
  receiveDebtPayment,
  updateCustomer,
} from "@/lib/services/customers";
import { requireModule } from "@/lib/auth/require-module";
import { canManageCustomers, SECTION_ACCESS } from "@/lib/services/permissions";
import {
  confirmCustomerCode,
  startCustomerVerification,
  verificationState,
} from "@/lib/services/telegram/customer-verify";
import QRCode from "qrcode";

/** Kassaga kiradigan rol va "Mijozlar" moduli yoqiq (o'chiq bo'lsa — 404). */
async function requireCashier() {
  const user = await requireUser(SECTION_ACCESS["/pos"]);
  await requireModule(user.tenantId, "customers");
  return user;
}

function customerInput(values: Record<string, string>) {
  return {
    name: values.name ?? "",
    phone: values.phone,
    note: values.note,
    creditLimit: values.creditLimit,
    discountPercent: values.discountPercent,
    isMaster: values.isMaster,
    bonusPercent: values.bonusPercent,
  };
}

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCashier();
  const values = formValues(formData);
  let id: string;
  try {
    const customer = await createCustomer(
      user.tenantId,
      customerInput(values),
      canManageCustomers(user.role),
    );
    id = customer.id;
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath("/pos/customers");
  redirect(`/pos/customers/${id}`);
}

export async function updateCustomerAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCashier();
  const values = formValues(formData);
  try {
    await updateCustomer(user.tenantId, id, customerInput(values), canManageCustomers(user.role));
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath(`/pos/customers/${id}`);
  revalidatePath("/pos/customers");
  return { ok: true };
}

export async function receiveDebtPaymentAction(
  customerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCashier();
  const values = formValues(formData);
  try {
    await receiveDebtPayment(user.tenantId, user.id, customerId, {
      amount: values.amount,
      method: values.method as "CASH",
      note: values.note,
    });
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath(`/pos/customers/${customerId}`);
  revalidatePath("/pos/customers");
  return { ok: true };
}

/** Kassada mijoz raqamini bot orqali tasdiqlash: QR (SVG) va havola. */
export async function startCustomerVerificationAction(
  customerId: string,
): Promise<{ url?: string; qr?: string; error?: string }> {
  const user = await requireCashier();
  try {
    const { url } = await startCustomerVerification(user.tenantId, customerId);
    const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 220 });
    return { url, qr };
  } catch (error) {
    return { error: toActionState(error).error };
  }
}

export async function customerVerificationStateAction(customerId: string) {
  const user = await requireCashier();
  return verificationState(user.tenantId, customerId);
}

export async function confirmCustomerCodeAction(
  customerId: string,
  code: string,
): Promise<ActionState> {
  const user = await requireCashier();
  try {
    await confirmCustomerCode(user.tenantId, customerId, String(code).slice(0, 10));
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/pos/customers/${customerId}`);
  return { ok: true };
}

export async function payMasterBonusAction(
  masterId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCashier();
  if (!canManageCustomers(user.role)) return { error: uz.customers.bonusPayoutForbidden };
  const values = formValues(formData);
  try {
    await payMasterBonus(user.tenantId, user.id, masterId, {
      amount: values.amount,
      method: values.method as "CASH",
      note: values.note,
    });
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath(`/pos/customers/${masterId}`);
  revalidatePath("/pos/customers");
  return { ok: true };
}
