"use server";

import { revalidatePath } from "next/cache";
import { formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { updateLead } from "@/lib/services/leads/leads";
import type { LeadUpdateInput } from "@/lib/validation/lead";

export async function updateLeadAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const values = formValues(formData);
  try {
    await updateLead(id, {
      status: values.status as LeadUpdateInput["status"],
      lostReason: values.lostReason,
      note: values.note,
      assignee: values.assignee,
    });
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}
