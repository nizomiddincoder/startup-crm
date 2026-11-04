import { z } from "zod";
import { marketing } from "@/lib/i18n/marketing.uz";
import { uz } from "@/lib/i18n/uz";
import { normalizePhone } from "./auth";
import { CONSENT_REQUIRED_SOURCES, LEAD_CITIES, LEAD_SOURCES } from "./lead-constants";

export { CONSENT_REQUIRED_SOURCES, LEAD_CITIES, LEAD_SOURCES };

export const LEAD_STATUSES = [
  "NEW",
  "CALLED",
  "VISIT_SET",
  "VISITED",
  "PILOT",
  "PAID",
  "LOST",
] as const;

const e = marketing.lead.errors;

const optionalText = (max: number, message: string = e.tooLong) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Ariza maydonlari (ariza formasi va ro'yxatdan o'tish uchun umumiy). */
const leadFields = z.object({
  name: z.string().trim().min(1, e.name).max(100, e.tooLong),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const phone = normalizePhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: e.phone });
        return z.NEVER;
      }
      return phone;
    }),
  city: z.enum(LEAD_CITIES, { message: e.city }),
  shopName: optionalText(150),
  message: optionalText(1000),
  source: z.enum(LEAD_SOURCES).default("website"),
  // Checkbox "on" yuboradi
  consent: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
});

/** Saytdagi ariza formasi (bosh sahifa, /jihozlar, /aloqa, /pilot). */
export const leadSchema = leadFields.superRefine((data, ctx) => {
  if (CONSENT_REQUIRED_SOURCES.includes(data.source) && !data.consent) {
    ctx.addIssue({ code: "custom", path: ["consent"], message: marketing.consent.required });
  }
});
export type LeadInput = z.input<typeof leadSchema>;

const s = marketing.signup.errors;

/** /register — o'zi ro'yxatdan o'tish: ariza maydonlari + parol, rozilik har doim majburiy. */
export const signupSchema = leadFields
  .extend({
    password: z.string().min(8, s.passwordShort).max(100, s.passwordLong),
  })
  .superRefine((data, ctx) => {
    if (!data.consent) {
      ctx.addIssue({ code: "custom", path: ["consent"], message: marketing.consent.required });
    }
  });
export type SignupInput = z.input<typeof signupSchema>;

export { attributionSchema, type Attribution } from "./attribution";

/** Admin: arizani yangilash. */
export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES, { message: uz.validation.invalidChoice }),
  lostReason: z
    .string()
    .trim()
    .max(300, uz.validation.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined)),
  note: z
    .string()
    .trim()
    .max(2000, uz.validation.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined)),
  assignee: z
    .string()
    .trim()
    .max(100, uz.validation.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;
