import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { phoneSchema } from "./auth";

/** Do'kon egasi qo'sha oladigan rollar (egasi va platforma admini — yo'q). */
export const STAFF_ROLES = ["MANAGER", "CASHIER", "WAREHOUSE"] as const;

const name = z.string().trim().min(1, uz.validation.required).max(100, uz.validation.tooLong);

export const staffSchema = z.object({
  name,
  phone: phoneSchema,
  role: z.enum(STAFF_ROLES, { message: uz.validation.invalidChoice }),
});
export type StaffInput = z.input<typeof staffSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, uz.validation.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined));

export const shopSchema = z.object({
  shopName: name,
  address: optionalText(200),
  shopPhone: optionalText(50),
  ownerName: name,
  ownerPhone: phoneSchema,
});
export type ShopInput = z.input<typeof shopSchema>;
