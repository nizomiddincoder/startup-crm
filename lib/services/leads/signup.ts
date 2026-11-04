/**
 * Saytda o'zi ro'yxatdan o'tish (/register): sinov do'koni + egasi + namunaviy katalog, so'ng
 * admin uchun ariza (Lead, source=self_signup) va Telegram xabar.
 * ISTISNO (admin.ts kabi): yangi tenant yaratiladi — tenantId sessiyadan emas, shu yerda paydo bo'ladi.
 */
import { db } from "@/lib/db";
import { marketing } from "@/lib/i18n/marketing.uz";
import { uz, t } from "@/lib/i18n/uz";
import { signupSchema } from "@/lib/validation/lead";
import { hashPassword } from "../auth";
import { isUniqueViolation, ServiceError } from "../errors";
import {
  formatLeadNotification,
  isHoneypotFilled,
  leadLimiter,
  type SubmitContext,
  type SubmitDeps,
} from "./leads";
import { createStarterCatalog } from "./starter-catalog";

export const TRIAL_DAYS = 30;

export type SignupResult =
  | { status: "created"; tenantId: string; phone: string }
  | { status: "spam" }
  | { status: "rate_limited" };

/**
 * Spam-tuzoq → IP cheklovi (arizalar bilan umumiy) → Zod → telefon bandmi → tranzaksiya
 * (do'kon, egasi, katalog) → ariza → Telegram. Zod va band telefon xatosi — tashlanadi.
 */
export async function selfSignup(
  input: unknown,
  ctx: SubmitContext,
  deps: SubmitDeps = {},
): Promise<SignupResult> {
  if (isHoneypotFilled(input)) return { status: "spam" };

  const limiter = deps.limiter ?? leadLimiter;
  const now = ctx.now ?? new Date();
  if (limiter.check(ctx.ip, now.getTime()).blocked) return { status: "rate_limited" };
  limiter.fail(ctx.ip, now.getTime());

  const data = signupSchema.parse(input);
  const phoneTaken = () => new ServiceError(marketing.signup.errors.phoneTaken, "phone");

  const existing = await db.user.findUnique({ where: { phone: data.phone }, select: { id: true } });
  if (existing) throw phoneTaken();

  const passwordHash = await hashPassword(data.password);
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  let tenantId: string;
  try {
    tenantId = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.shopName ?? t(marketing.signup.defaultShopName, { name: data.name }),
          phone: data.phone,
          trialEndsAt,
        },
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.name,
          phone: data.phone,
          role: "OWNER",
          passwordHash,
        },
      });
      await createStarterCatalog(tx, tenant.id);
      return tenant.id;
    });
  } catch (error) {
    // Bir vaqtda ikki marta yuborilsa — ikkinchisi shu yerda to'xtaydi
    if (isUniqueViolation(error)) throw phoneTaken();
    throw error;
  }

  const lead = await db.lead.create({
    data: {
      name: data.name,
      phone: data.phone,
      city: data.city,
      shopName: data.shopName,
      message: uz.leads.signupMessage,
      source: "self_signup",
      utmSource: ctx.attribution.utmSource,
      utmCampaign: ctx.attribution.utmCampaign,
      keyword: ctx.attribution.keyword,
      ref: ctx.attribution.ref,
      consentAt: now,
      createdAt: now,
    },
  });

  if (deps.notify) {
    try {
      await deps.notify(formatLeadNotification(lead));
    } catch (error) {
      console.warn(
        "[signup] Telegram xabari yuborilmadi:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { status: "created", tenantId, phone: data.phone };
}
