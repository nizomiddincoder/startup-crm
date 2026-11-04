"use server";

import { revalidatePath } from "next/cache";
import { forbiddenState, formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { hasModule } from "@/lib/services/modules";
import { canManageCustomers } from "@/lib/services/permissions";
import {
  createPromotion,
  setCashbackPercent,
  setPromotionActive,
  type PromotionInput,
} from "@/lib/services/promotions";

async function requireManager() {
  const user = await requireUser();
  if (!canManageCustomers(user.role) || !(await hasModule(user.tenantId, "marketing"))) return null;
  return user;
}

export async function saveCashbackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const values = formValues(formData);
  try {
    await setCashbackPercent(user.tenantId, { cashbackPercent: values.cashbackPercent });
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath("/dashboard/marketing");
  return { ok: true, message: uz.promotions.saved, values };
}

export async function createPromotionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const values = formValues(formData);
  try {
    await createPromotion(user.tenantId, values as unknown as PromotionInput);
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath("/dashboard/marketing");
  return { ok: true, message: uz.promotions.saved };
}

export async function setPromotionActiveAction(id: string, isActive: boolean) {
  const user = await requireManager();
  if (!user) return;
  await setPromotionActive(user.tenantId, id, isActive);
  revalidatePath("/dashboard/marketing");
}
