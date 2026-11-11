"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { changeOwnPassword } from "@/lib/services/auth";
import { passwordChangeSchema } from "@/lib/validation/auth";

export type AccountState = {
  error?: string;
  fieldErrors?: Partial<Record<"current" | "next" | "repeat", string>>;
};

/**
 * Admin (egasi, menejer, omborchi, platforma admini) o'z parolini o'zgartiradi.
 * Muvaffaqiyatli bo'lsa — sessiya yopiladi va qayta kirish so'raladi.
 */
export async function changePasswordAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireUser();
  if (user.role === "CASHIER") return { error: uz.account.cashierNote };

  const parsed = passwordChangeSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    repeat: formData.get("repeat"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        current: errors.current?.[0],
        next: errors.next?.[0],
        repeat: errors.repeat?.[0],
      },
    };
  }

  const result = await changeOwnPassword(user.id, parsed.data.current, parsed.data.next);
  if (result === "wrong_current") return { fieldErrors: { current: uz.account.wrongCurrent } };

  // Sessiyalar yopildi — /logout cookie'ni tozalaydi, keyin login sahifasi
  redirect("/logout");
}
