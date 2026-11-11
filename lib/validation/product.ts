import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { MAX_PRICE, parseSum } from "@/lib/services/money";

export const UNITS = [
  "PIECE",
  "METER",
  "SQ_METER",
  "CUBIC_METER",
  "KG",
  "TON",
  "LITER",
  "BAG",
  "PACK",
  "ROLL",
  "SHEET",
  "BOX",
] as const;
export type UnitValue = (typeof UNITS)[number];

const isBlank = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

/** Bo'sh satrni undefined'ga aylantiradi (ixtiyoriy maydonlar uchun). */
const blankToUndefined = (value: unknown) => (isBlank(value) ? undefined : value);

/** Narxni tekshiradi: "125 000" kabi matnni ham, sonni ham qabul qiladi, natija — butun so'm. */
function checkPrice(value: unknown, ctx: z.RefinementCtx, required: boolean): number | undefined {
  if (isBlank(value)) {
    if (required) ctx.addIssue({ code: "custom", message: uz.validation.required });
    return undefined;
  }
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? parseSum(value) : null;
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    ctx.addIssue({ code: "custom", message: uz.validation.invalidPrice });
    return undefined;
  }
  if (parsed > MAX_PRICE) {
    ctx.addIssue({ code: "custom", message: uz.validation.priceTooHigh });
    return undefined;
  }
  return parsed;
}

// Xato bo'lsa Zod natijani baribir rad etadi, shuning uchun "as number" xavfsiz.
export const requiredPrice = z.unknown().transform((v, ctx) => checkPrice(v, ctx, true) as number);
export const optionalPrice = z
  .unknown()
  .transform((v, ctx) => checkPrice(v, ctx, false))
  .optional();

export const categorySchema = z.object({
  name: z.string().trim().min(1, uz.validation.required).max(100, uz.validation.tooLong),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const productSchema = z.object({
  name: z.string().trim().min(1, uz.validation.required).max(200, uz.validation.tooLong),
  categoryId: z.preprocess(blankToUndefined, z.string().optional()),
  unit: z.enum(UNITS, { message: uz.validation.invalidChoice }),
  salePrice: requiredPrice,
  costPrice: optionalPrice,
  barcode: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z-]{4,32}$/, uz.validation.invalidBarcode)
      .optional(),
  ),
  // Minimal qoldiq: "10" yoki "2,5" — kasr belgisi nuqtaga aylantiriladi
  minStock: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{1,9}([.,]\d{1,3})?$/, uz.validation.invalidQuantity)
      .transform((v) => v.replace(",", "."))
      .optional(),
  ),
});
export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;
