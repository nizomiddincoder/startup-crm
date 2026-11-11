import { z } from "zod";

// Mini App so'rovlari (app/api/miniapp). Har so'rovda Telegram imzosi (initData) ham tekshiriladi.
const id = z.string().trim().min(1).max(40);

export const catalogQuerySchema = z.object({
  customerId: id,
  category: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(0).max(1000).default(0),
});

export const shopActionSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("change"),
    customerId: id,
    productId: id,
    // +1 / −1 (yoki bir nechta). 0 — ma'nosiz
    delta: z.number().int().min(-99).max(99).refine((d) => d !== 0, "delta 0 bo'lmasin"),
  }),
  z.object({ op: z.literal("clear"), customerId: id }),
  z.object({ op: z.literal("submit"), customerId: id }),
]);
export type ShopAction = z.output<typeof shopActionSchema>;
