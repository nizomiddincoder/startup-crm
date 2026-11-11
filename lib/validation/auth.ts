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

/** Admin kirishi: login (masalan "admin") yoki telefon + parol. */
export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1, uz.validation.required).max(60, uz.validation.tooLong),
  password: z.string().min(6, uz.validation.minPassword),
});

/** Admin o'z parolini o'zgartirishi: eski parol, yangi parol (kamida 8), takror. */
export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, uz.validation.required),
    next: z.string().min(8, uz.account.minPassword).max(100, uz.validation.tooLong),
    repeat: z.string(),
  })
  .refine((d) => d.next === d.repeat, { path: ["repeat"], message: uz.account.mismatch });

/** Kassir kirishi: 4 xonali PIN. */
export const pinLoginSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, uz.validation.invalidPin),
});

export type AdminLoginInput = z.input<typeof adminLoginSchema>;
