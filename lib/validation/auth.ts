import { z } from "zod";
import { uz } from "@/lib/i18n/uz";

/**
 * Telefonni yagona formatga keltiradi: "+998 90 123-45-67", "901234567" → "+998901234567".
 * Noto'g'ri bo'lsa null qaytaradi.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return null;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, uz.validation.required)
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: uz.validation.invalidPhone });
      return z.NEVER;
    }
    return phone;
  });

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6, uz.validation.minPassword),
});

export type LoginInput = z.input<typeof loginSchema>;
