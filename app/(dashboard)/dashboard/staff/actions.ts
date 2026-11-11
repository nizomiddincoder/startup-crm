"use server";

import { revalidatePath } from "next/cache";
import { formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { canManageStaff } from "@/lib/services/permissions";
import {
  createStaff,
  resetStaffPassword,
  resetStaffPin,
  setStaffActive,
} from "@/lib/services/staff";
import type { StaffInput } from "@/lib/validation/staff";

async function requireOwner() {
  const user = await requireUser();
  return canManageStaff(user.role) ? user : null;
}

export type StaffActionState = ActionState & {
  /** Kassir uchun PIN, boshqalar uchun parol — faqat bir marta ko'rsatiladi */
  created?: { name: string; phone: string; password?: string; pin?: string };
};

export async function createStaffAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const owner = await requireOwner();
  if (!owner) return { error: uz.bot.staffOnly };
  const values = formValues(formData);
  try {
    const result = await createStaff(owner.tenantId, {
      name: values.name ?? "",
      phone: values.phone ?? "",
      role: values.role as StaffInput["role"],
    });
    revalidatePath("/dashboard/staff");
    return {
      ok: true,
      created: {
        name: result.user.name,
        phone: result.user.phone,
        ...("pin" in result ? { pin: result.pin } : { password: result.password }),
      },
    };
  } catch (error) {
    return toActionState(error, values);
  }
}

export async function setStaffActiveAction(userId: string, isActive: boolean) {
  const owner = await requireOwner();
  if (!owner) return { error: uz.bot.staffOnly };
  try {
    await setStaffActive(owner.tenantId, owner.id, userId, isActive);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/dashboard/staff");
  return { ok: true };
}

export async function resetStaffPasswordAction(
  userId: string,
): Promise<{ password?: string; error?: string }> {
  const owner = await requireOwner();
  if (!owner) return { error: uz.bot.staffOnly };
  try {
    return { password: await resetStaffPassword(owner.tenantId, owner.id, userId) };
  } catch (error) {
    return { error: toActionState(error).error };
  }
}

export async function resetStaffPinAction(
  userId: string,
): Promise<{ pin?: string; error?: string }> {
  const owner = await requireOwner();
  if (!owner) return { error: uz.bot.staffOnly };
  try {
    return { pin: await resetStaffPin(owner.tenantId, owner.id, userId) };
  } catch (error) {
    return { error: toActionState(error).error };
  }
}
