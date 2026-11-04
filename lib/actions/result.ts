import { ZodError } from "zod";
import { uz } from "@/lib/i18n/uz";
import { ServiceError } from "@/lib/services/errors";

/** Server action'lar formaga qaytaradigan natija. `values` — xato bo'lsa forma qayta to'ldiriladi. */
export type ActionState = {
  ok?: boolean;
  /** Muvaffaqiyat haqida qisqa xabar (masalan, "Chop etildi…") */
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
  values?: Record<string, string>;
};

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  });
  return values;
}

/** Zod va biznes xatolarini formaga tushunarli ko'rinishga keltiradi; boshqa xatolar yuqoriga uzatiladi. */
export function toActionState(error: unknown, values?: Record<string, string>): ActionState {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }
  if (error instanceof ServiceError) {
    return error.field
      ? { fieldErrors: { [error.field]: error.message }, values }
      : { error: error.message, values };
  }
  throw error;
}

export const forbiddenState: ActionState = { error: uz.products.readOnly };
