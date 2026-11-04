"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { askAssistant, type AssistantInput } from "@/lib/services/assistant";
import { createSupportRequest, setSupportResolved } from "@/lib/services/support";

/** "Yordam" → "Muammo haqida xabar berish" (barcha rollar). */
export async function sendSupportRequestAction(input: {
  message: string;
  page?: string;
  errorCode?: string;
}): Promise<ActionState> {
  const user = await requireUser();
  try {
    await createSupportRequest(user.tenantId, user.id, input);
  } catch (error) {
    return toActionState(error);
  }
  return { ok: true };
}

/** "Yordam" → "AI yordamchi": savol + oldingi suhbat (oxirgi 12 ta). */
export async function askAssistantAction(
  input: AssistantInput,
): Promise<{ answer?: string; error?: string }> {
  const user = await requireUser();
  try {
    const answer = await askAssistant(
      { tenantId: user.tenantId, userId: user.id, role: user.role },
      input,
    );
    return { answer };
  } catch (error) {
    const state = toActionState(error);
    return { error: state.error ?? state.fieldErrors?.question };
  }
}

export async function setSupportResolvedAction(id: string, resolved: boolean) {
  await requireUser(["SUPER_ADMIN"]);
  await setSupportResolved(id, resolved);
  revalidatePath("/admin/support");
}
