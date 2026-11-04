import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { MAX_LINES } from "./sale";
import { optionalPrice } from "./product";

/**
 * Ombor hujjati qatorlari. Miqdor birlikka qarab serverda (`parseQuantity`) tekshiriladi.
 * Kirimda kelish narxi ixtiyoriy.
 */
const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.string().trim().min(1, uz.pos.invalidQuantity).max(20),
  costPrice: optionalPrice,
});

const linesSchema = z.array(lineSchema).min(1, uz.warehouse.noLines).max(MAX_LINES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, uz.validation.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined));

export const receiptSchema = z.object({
  items: linesSchema,
  supplierName: optionalText(150),
  note: optionalText(500),
});

export const writeOffSchema = z.object({
  items: linesSchema,
  note: z.string().trim().min(1, uz.warehouse.reasonRequired).max(500, uz.validation.tooLong),
});

export const inventorySchema = z.object({
  items: linesSchema,
  note: optionalText(500),
});

export type StockDocumentInput = {
  items: { productId: string; quantity: string; costPrice?: unknown }[];
  supplierName?: string;
  note?: string;
};
