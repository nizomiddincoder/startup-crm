import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { normalizePhone } from "./auth";
import { optionalPrice } from "./product";

/** Bitta sotuvdagi maksimal qatorlar soni. */
export const MAX_LINES = 200;

/**
 * Kassadan faqat mahsulot ID va miqdor keladi. Narx bu yerda YO'Q — server uni bazadan oladi,
 * shunda brauzerda narxni o'zgartirib bo'lmaydi. Miqdor birlikka qarab serverda tekshiriladi.
 */
const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.string().trim().min(1, uz.pos.invalidQuantity).max(20),
});

const linesSchema = z.array(lineSchema).min(1, uz.pos.emptySale).max(MAX_LINES);

const amountOrZero = optionalPrice.transform((v) => v ?? 0);

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

export const saleSchema = z.object({
  items: linesSchema,
  discount: amountOrZero,
  payments: z.object({
    cash: amountOrZero,
    card: amountOrZero,
    transfer: amountOrZero,
    debt: amountOrZero,
    points: amountOrZero,
  }),
  estimateId: optionalId,
  // Telegram buyurtmasidan sotilsa — buyurtma "Sotildi" bo'ladi
  orderId: optionalId,
  customerId: optionalId,
  masterId: optionalId,
  // "2026-11-15" → shu kun, Toshkent vaqti bilan
  dueDate: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        ctx.addIssue({ code: "custom", message: uz.validation.invalidChoice });
        return z.NEVER;
      }
      return new Date(`${v}T00:00:00+05:00`);
    }),
});
export type SaleInput = z.input<typeof saleSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, uz.validation.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined));

export const estimateSchema = z.object({
  items: linesSchema,
  discount: amountOrZero,
  customerName: optionalText(100),
  customerPhone: optionalText(30)
    .refine((v) => !v || normalizePhone(v) !== null, {
      message: uz.validation.invalidPhone,
    })
    .transform((v) => (v ? (normalizePhone(v) ?? undefined) : undefined)),
  note: optionalText(500),
});
export type EstimateInput = z.input<typeof estimateSchema>;

/** Qaytarish: chek qatorlari va miqdor (birlik serverda tekshiriladi), pul qaytarish usuli. */
export const returnSchema = z.object({
  saleId: z.string().min(1),
  items: z
    .array(
      z.object({
        saleItemId: z.string().min(1),
        quantity: z.string().trim().max(20),
      }),
    )
    .max(MAX_LINES),
  refundMethod: z.enum(["CASH", "CARD", "TRANSFER", "DEBT"], {
    message: uz.validation.invalidChoice,
  }),
  reason: optionalText(300),
});
export type ReturnInput = z.input<typeof returnSchema>;

/** Smena: ochilishdagi yoki sanalgan naqd (so'm, "1 500 000" ham bo'ladi). */
export const shiftCashSchema = z.object({
  cash: optionalPrice.transform((v) => v ?? 0),
  note: optionalText(300),
});
export type ShiftCashInput = z.input<typeof shiftCashSchema>;
