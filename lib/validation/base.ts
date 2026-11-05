import { z } from "zod";
import { uz } from "@/lib/i18n/uz";

export const phoneField = z
  .string()
  .trim()
  .min(1, uz.validation.required)
  .refine((v) => /^\+998\d{9}$/.test(v), { message: uz.validation.invalidPhone });

export const codeField = z
  .string()
  .trim()
  .min(4, uz.validation.required)
  .max(6, uz.validation.required)
  .regex(/^\d+$/, uz.validation.invalidChoice);

export const nameField = z
  .string()
  .trim()
  .min(2, uz.validation.tooLong)
  .max(60, uz.validation.tooLong);

export const choiceField = <T extends string>(options: readonly T[]) =>
  z.enum(options as readonly [T, ...T[]], {
    message: uz.validation.invalidChoice,
  });
