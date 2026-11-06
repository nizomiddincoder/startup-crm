/**
 * SaaS tariflar (Start / Biznes / Premium) va qo'shimcha xizmat (add-on) narxlari.
 * Narxlar — so'mda (Int). Bitta joyda saqlanadi: o'zgartirish faqat shu faylda.
 * Prisma import qilinmaydi (klientda ham ishlaydi).
 */

export const SAAS_PLAN_IDS = ["start", "biznes", "premium"] as const;
export type SaaSPlanId = (typeof SAAS_PLAN_IDS)[number];

/** Eski (marketing) tariflari — ular premium chegaralarida ishlaydi. */
export const LEGACY_PLAN_IDS = ["standard", "custom", "turnkey"] as const;

export const TRIAL_DAYS = 30;

export type SaaSPlan = {
  label: string;
  /** Oylik narx, so'm */
  monthlyPrice: number;
  /** Filiallar limiti */
  branches: number;
  /** Xodimlar (kassirlar) limiti */
  cashiers: number;
};

export const SAAS_PLANS: Record<SaaSPlanId, SaaSPlan> = {
  start: { label: "Start", monthlyPrice: 199_000, branches: 1, cashiers: 2 },
  biznes: { label: "Biznes", monthlyPrice: 449_000, branches: 3, cashiers: 8 },
  premium: { label: "Premium", monthlyPrice: 899_000, branches: 10, cashiers: 25 },
};

/** Qo'shimcha birlik narxlari (oyiga, so'm). */
export const ADDON_PRICES = {
  branch: 99_000,
  cashier: 49_000,
  production: 199_000,
} as const;

export function isSaaSPlan(value: string): value is SaaSPlanId {
  return (SAAS_PLAN_IDS as readonly string[]).includes(value);
}

export function isKnownPlan(value: string): boolean {
  return isSaaSPlan(value) || (LEGACY_PLAN_IDS as readonly string[]).includes(value);
}

/**
 * Tarif chegaralari. Eski tariflar ("custom" va boshqalar) — premium darajasida,
 * chunki ular SaaS tariflar paydo bo'lishidan oldingi mijozlar.
 */
export function planLimits(tenant: {
  plan: string;
  addonBranches?: number | null;
  addonCashiers?: number | null;
}): { branches: number; cashiers: number; plan: SaaSPlan } {
  const planId = isSaaSPlan(tenant.plan) ? tenant.plan : "premium";
  const plan = SAAS_PLANS[planId];
  return {
    plan,
    branches: plan.branches + Number(tenant.addonBranches ?? 0),
    cashiers: plan.cashiers + Number(tenant.addonCashiers ?? 0),
  };
}

/**
 * Hisob "faqat o'qish" rejimidami: sinov muddati tugagan yoki to'xtatilgan.
 * PAST_DUE — to'lov kechikkan, lekin hali ham ishlaydi (ogohlantirish ko'rsatiladi).
 */
export function subscriptionReadOnly(
  tenant: Pick<Record<string, unknown>, "planStatus" | "trialEndsAt" | "businessType">,
): boolean {
  const status = tenant.planStatus;
  if (status === "SUSPENDED") return true;
  // Eski mijozlar (onboarding'dan o'tmagan) — bloklanmaydi, oqim buzilmasin
  if (!tenant.businessType) return false;
  if (status === "TRIAL" && tenant.trialEndsAt && new Date(tenant.trialEndsAt as Date) < new Date())
    return true;
  return false;
}

export function trialEndsAtFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
