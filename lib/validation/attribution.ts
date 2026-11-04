import { z } from "zod";

// Alohida fayl: middleware'da ishlatiladi — matnlar (uz.ts) bu yerga import qilinmasin.

/** Reklama belgilari (cookie'dan). Har biri qisqa matn; boshqasi tashlab yuboriladi. */
const tag = z
  .string()
  .trim()
  .max(100)
  .optional()
  .catch(undefined)
  .transform((v) => (v ? v : undefined));

export const attributionSchema = z
  .object({ utmSource: tag, utmCampaign: tag, keyword: tag, ref: tag })
  .catch({ utmSource: undefined, utmCampaign: undefined, keyword: undefined, ref: undefined });
export type Attribution = z.output<typeof attributionSchema>;
