import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { normalizePhone } from "./auth";
import { optionalPrice, requiredPrice } from "./product";

const isBlank = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && !v.trim());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, uz.validation.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Forma checkbox'i "on" yuboradi, kod esa boolean. */
const checkbox = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

/** "3" yoki "2,5" → "2.5"; 0..100, ko'pi bilan 2 kasr. Bo'sh — undefined. */
export const percent = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (isBlank(v)) return undefined;
    const s = v!.trim().replace(",", ".");
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(s) || Number(s) > 100) {
      ctx.addIssue({ code: "custom", message: uz.customers.invalidPercent });
      return z.NEVER;
    }
    return s;
  });

export const customerSchema = z.object({
  name: z.string().trim().min(1, uz.validation.required).max(100, uz.validation.tooLong),
  phone: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (isBlank(v)) return undefined;
      const phone = normalizePhone(v!);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: uz.validation.invalidPhone });
        return z.NEVER;
      }
      return phone;
    }),
  note: optionalText(500),
  creditLimit: optionalPrice,
  isMaster: checkbox,
  bonusPercent: percent,
  // Shaxsiy chegirma (kassada mijoz tanlanganda avtomatik)
  discountPercent: percent,
});
export type CustomerInput = z.input<typeof customerSchema>;

const cashlessMethod = z.enum(["CASH", "CARD", "TRANSFER"], {
  message: uz.validation.invalidChoice,
});

export const debtPaymentSchema = z.object({
  amount: requiredPrice.refine((v) => v > 0, uz.validation.invalidPrice),
  method: cashlessMethod,
  note: optionalText(300),
});
export type DebtPaymentInput = z.input<typeof debtPaymentSchema>;

/** Bonus berish: naqd/karta/o'tkazma yoki DEBT — ustaning o'z qarzidan ayirish. */
export const bonusPayoutSchema = z.object({
  amount: requiredPrice.refine((v) => v > 0, uz.validation.invalidPrice),
  method: z.enum(["CASH", "CARD", "TRANSFER", "DEBT"], { message: uz.validation.invalidChoice }),
  note: optionalText(300),
});
export type BonusPayoutInput = z.input<typeof bonusPayoutSchema>;
