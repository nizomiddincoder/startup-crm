"use server";

import { revalidatePath } from "next/cache";
import { forbiddenState, formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { createCategory, deleteCategory, renameCategory } from "@/lib/services/categories";
import { canManageProducts } from "@/lib/services/permissions";

async function requireManager() {
  const user = await requireUser();
  return canManageProducts(user.role) ? user : null;
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const values = formValues(formData);
  try {
    await createCategory(user.tenantId, { name: values.name ?? "" });
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath("/dashboard/categories");
  return { ok: true };
}

export async function renameCategoryAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const values = formValues(formData);
  try {
    await renameCategory(user.tenantId, id, { name: values.name ?? "" });
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath("/dashboard/categories");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  try {
    await deleteCategory(user.tenantId, id);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/dashboard/categories");
  return { ok: true };
}
