/**
 * Billing: obuna holati, limitlar, to'lov yaratish va to'lov tugaganda tarif/add-on/modul
 * yoqish. To'lov provayderlari — lib/billing/providers.ts (mock, click, payme stublari).
 */
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import {
  ADDON_PRICES,
  isSaaSPlan,
  SAAS_PLANS,
  TRIAL_DAYS,
  type SaaSPlanId,
} from "@/lib/plans";
import { isModuleId } from "@/lib/modules";
import { ServiceError } from "./errors";
import { getPaymentProvider } from "@/lib/billing/providers";

export type CheckoutPurpose = `plan:${SaaSPlanId}` | "addon:branch" | "addon:cashier" | `module:${string}`;

export function parsePurpose(purpose: string): CheckoutPurpose | null {
  if (purpose === "addon:branch" || purpose === "addon:cashier") return purpose;
  const [kind, value] = purpose.split(":");
  if (kind === "plan" && isSaaSPlan(value)) return `plan:${value}`;
  if (kind === "module" && isModuleId(value)) return `module:${value}`;
  return null;
}

export function amountFor(purpose: CheckoutPurpose, months: number): number {
  if (purpose.startsWith("plan:")) return SAAS_PLANS[purpose.split(":")[1] as SaaSPlanId].monthlyPrice * months;
  if (purpose === "addon:branch") return ADDON_PRICES.branch;
  if (purpose === "addon:cashier") return ADDON_PRICES.cashier;
  // Modullar: hozircha faqat "production" pullik qo'shimcha; qolganlari — so'rov (Request)
  if (purpose === "module:production") return ADDON_PRICES.production;
  return 0;
}

/**
 * To'lov yaratadi va provayder to'lov sahifasini qaytaradi.
 * Narxi 0 modullar uchun to'g'ridan-to'g'ri so'rov (ModuleRequest) yaratiladi.
 */
export async function createCheckout(
  tenantId: string,
  purpose: string,
  providerKey: string,
  months = 1,
) {
  const parsed = parsePurpose(purpose);
  if (!parsed) throw new ServiceError(uz.validation.invalidChoice, "purpose");
  const monthsClean = parsed.startsWith("plan:") ? Math.min(Math.max(months, 1), 12) : 1;
  const amount = amountFor(parsed, monthsClean);
  if (amount === 0) {
    await requestModule(tenantId, parsed.split(":")[1]);
    return { paymentId: null, redirectUrl: null, requested: true };
  }
  const provider = getPaymentProvider(providerKey);
  if (!provider) throw new ServiceError(uz.validation.invalidChoice, "provider");
  const payment = await db.payment.create({
    data: { tenantId, provider: provider.key, amount, purpose: parsed, months: monthsClean },
  });
  const { redirectUrl } = await provider.createPayment({
    id: payment.id,
    amount,
    purpose: parsed,
    months: monthsClean,
  });
  if (!redirectUrl) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw new ServiceError(uz.billing.providerNotConfigured, "provider");
  }
  return { paymentId: payment.id, redirectUrl, requested: false };
}

/** Egasi qo'shimcha modul so'raydi: so'rov saqlanadi (narx tasdiqlangach yoqiladi). */
export async function requestModule(tenantId: string, moduleKey: string) {
  if (!isModuleId(moduleKey)) throw new ServiceError(uz.validation.invalidChoice, "moduleKey");
  const existing = await db.moduleRequest.findFirst({
    where: { tenantId, moduleKey, status: "PENDING" },
  });
  if (existing) return existing;
  return db.moduleRequest.create({ data: { tenantId, moduleKey } });
}

/**
 * To'lov to'langanda: tarif/add-on/modul yoqiladi. Webhook'dan chaqiriladi.
 * plan:* → planStatus ACTIVE, planRenewsAt, trial tugaydi;
 * addon:branch/cashier → limit +1; module:* → modul ACTIVATED.
 */
export async function markPaymentPaid(paymentId: string, providerRef?: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === "PAID") return payment;
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", paidAt: new Date(), ...(providerRef ? { providerRef } : {}) },
    });
    const purpose = parsePurpose(payment.purpose);
    if (!purpose) return payment;

    if (purpose.startsWith("plan:")) {
      const planId = purpose.split(":")[1] as SaaSPlanId;
      const renewsAt = new Date(Date.now() + payment.months * TRIAL_DAYS * 24 * 60 * 60 * 1000);
      await tx.tenant.update({
        where: { id: payment.tenantId },
        data: { plan: planId, planStatus: "ACTIVE", planRenewsAt: renewsAt, trialEndsAt: null },
      });
    } else if (purpose === "addon:branch") {
      await tx.tenant.update({ where: { id: payment.tenantId }, data: { addonBranches: { increment: 1 } } });
    } else if (purpose === "addon:cashier") {
      await tx.tenant.update({ where: { id: payment.tenantId }, data: { addonCashiers: { increment: 1 } } });
    } else if (purpose.startsWith("module:")) {
      const moduleKey = purpose.split(":")[1];
      await tx.moduleRequest.upsert({
        where: { tenantId_moduleKey_status: { tenantId: payment.tenantId, moduleKey, status: "ACTIVATED" } },
        create: { tenantId: payment.tenantId, moduleKey, status: "ACTIVATED", resolvedAt: new Date() },
        update: { resolvedAt: new Date() },
      });
    }
    return payment;
  });
}

/** To'lov bekor qilinadi (Payme cancel / Click error). Plan maqsadli bo'lsa — PAST_DUE. */
export async function markPaymentCancelled(paymentId: string, reason?: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "PAID") return payment;
  await db.payment.update({
    where: { id: paymentId },
    data: { status: "CANCELLED", ...(reason ? { payload: { reason } } : {}) },
  });
  const purpose = parsePurpose(payment.purpose);
  if (purpose?.startsWith("plan:")) {
    const tenant = await db.tenant.findUnique({
      where: { id: payment.tenantId },
      select: { planStatus: true },
    });
    if (tenant && (tenant.planStatus === "ACTIVE" || tenant.planStatus === "TRIAL")) {
      await db.tenant.update({ where: { id: payment.tenantId }, data: { planStatus: "PAST_DUE" } });
    }
  }
  return payment;
}

/** To'lovlar tarixi (billing sahifasi). */
export async function listPayments(tenantId: string) {
  return db.payment.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/** Modul so'rovlari (billing sahifasi). */
export async function listModuleRequests(tenantId: string) {
  return db.moduleRequest.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
