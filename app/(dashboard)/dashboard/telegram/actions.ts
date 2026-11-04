"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { canReceiveReports } from "@/lib/services/permissions";
import { unlinkUser, updateTelegramPrefs } from "@/lib/services/telegram/linking";

export async function saveTelegramPrefsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const reportsAllowed = canReceiveReports(user.role);
  await updateTelegramPrefs(user.tenantId, user.id, {
    loginConfirm: formData.get("loginConfirm") === "on",
    ...(reportsAllowed
      ? {
          reports: formData.get("reports") === "on",
          reminders: formData.get("reminders") === "on",
        }
      : {}),
  });
  revalidatePath("/dashboard/telegram");
  return { ok: true };
}

export async function unlinkTelegramAction() {
  const user = await requireUser();
  await unlinkUser(user.tenantId, user.id);
  revalidatePath("/dashboard/telegram");
}
