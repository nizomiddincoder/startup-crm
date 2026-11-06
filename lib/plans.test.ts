/**
 * Tarif limitlari va obuna holatlari — unit testlar (baza kerak emas).
 */
import { describe, expect, it } from "vitest";
import {
  ADDON_PRICES,
  SAAS_PLANS,
  TRIAL_DAYS,
  isKnownPlan,
  isSaaSPlan,
  planLimits,
  subscriptionReadOnly,
  trialEndsAtFromNow,
} from "./plans";

describe("planLimits", () => {
  it("tariflar: Start 1 filial/2 kassir, Biznes 3/8, Premium 10/25", () => {
    expect(planLimits({ plan: "start" })).toMatchObject({ branches: 1, cashiers: 2 });
    expect(planLimits({ plan: "biznes" })).toMatchObject({ branches: 3, cashiers: 8 });
    expect(planLimits({ plan: "premium" })).toMatchObject({ branches: 10, cashiers: 25 });
    expect(SAAS_PLANS.start.monthlyPrice).toBeGreaterThan(0);
  });

  it("qo'shimchalar (addon) limitni oshiradi", () => {
    expect(
      planLimits({ plan: "start", addonBranches: 2, addonCashiers: 3 }),
    ).toMatchObject({ branches: 3, cashiers: 5 });
  });

  it("eski/noma'lum tarif — premium darajasida", () => {
    expect(planLimits({ plan: "custom" }).plan).toBe(SAAS_PLANS.premium);
    expect(planLimits({ plan: "noma'lum" }).plan).toBe(SAAS_PLANS.premium);
  });

  it("addon narxlari musbat", () => {
    for (const price of Object.values(ADDON_PRICES)) expect(price).toBeGreaterThan(0);
  });
});

describe("subscriptionReadOnly", () => {
  const day = 24 * 60 * 60 * 1000;
  const base = { businessType: "RETAIL" as const, trialEndsAt: null };

  it("SUSPENDED — doim faqat o'qish", () => {
    expect(subscriptionReadOnly({ ...base, planStatus: "SUSPENDED" })).toBe(true);
  });

  it("TRIAL muddati o'tgan — faqat o'qish", () => {
    expect(
      subscriptionReadOnly({ ...base, planStatus: "TRIAL", trialEndsAt: new Date(Date.now() - day) }),
    ).toBe(true);
  });

  it("TRIAL davom etmoqda, ACTIVE, PAST_DUE — yozishga ruxsat", () => {
    expect(
      subscriptionReadOnly({ ...base, planStatus: "TRIAL", trialEndsAt: new Date(Date.now() + day) }),
    ).toBe(false);
    expect(subscriptionReadOnly({ ...base, planStatus: "ACTIVE" })).toBe(false);
    expect(subscriptionReadOnly({ ...base, planStatus: "PAST_DUE" })).toBe(false);
  });

  it("eski mijoz (onboarding yo'q) bloklanmaydi", () => {
    expect(subscriptionReadOnly({ planStatus: "TRIAL", businessType: null, trialEndsAt: new Date(Date.now() - day) })).toBe(false);
  });
});

describe("tarif yordamchilari", () => {
  it("sinov muddati 30 kun", () => {
    const now = new Date("2026-11-06T00:00:00Z");
    const ends = trialEndsAtFromNow(now);
    expect((ends.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)).toBe(TRIAL_DAYS);
  });

  it("plan ID tekshiruvlari", () => {
    for (const id of ["start", "biznes", "premium"]) expect(isSaaSPlan(id)).toBe(true);
    expect(isSaaSPlan("custom")).toBe(false);
    expect(isKnownPlan("turnkey")).toBe(true);
    expect(isKnownPlan("yoq")).toBe(false);
  });
});
