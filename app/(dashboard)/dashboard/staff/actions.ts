"use server";

import { revalidatePath } from "next/cache";
import { formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { canManageStaff } from "@/lib/services/permissions";
import { createStaff, resetStaffPassword, setStaffActive } from "@/lib/services/staff";
import type { StaffInput } from "@/lib/validation/staff";

async function requireOwner() {
  const user = await requireUser();
  return canManageStaff(user.role) ? user : null;
}

export type StaffActionState = ActionState & {
  created?: { name: string; phone: string; password: string };
};

export async function createStaffAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const owner = await requireOwner();
  if (!owner) return { error: uz.bot.staffOnly };
  const values = formValues(formData);
  try {
    const { user, password } = await createStaff(owner.tenantId, {
      name: values.name ?? "",
      phone: values.phone ?? "",
      role: values.role as StaffInput["role"],
    });
    revalidatePath("/dashboard/staff");
    return { ok: true, created: { name: user.name, phone: user.phone, password } };
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
