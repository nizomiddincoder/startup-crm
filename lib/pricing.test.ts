import { describe, expect, it } from "vitest";
import { annualMonthlyEquivalent, annualPrice, getPlan, pilotSetupFee, pricing } from "./pricing";

describe("narxlar konfiguratsiyasi", () => {
  it("paketlar topshiriqdagidek", () => {
    expect(getPlan("standard")).toMatchObject({ setupFee: 1_000_000, monthly: 390_000 });
    expect(getPlan("custom")).toMatchObject({
      setupFee: 3_000_000,
      monthly: 490_000,
      popular: true,
    });
    expect(getPlan("turnkey")).toMatchObject({
      setupFee: 3_000_000,
      monthly: 490_000,
      plusEquipment: true,
    });
    expect(pricing.plans.filter((p) => p.popular)).toHaveLength(1);
  });

  it("yillik to'lovda 2 oy bepul", () => {
    expect(annualPrice(390_000)).toBe(3_900_000);
    expect(annualMonthlyEquivalent(390_000)).toBe(325_000);
    expect(annualMonthlyEquivalent(490_000)).toBe(408_000);
  });

  it("pilot: ulanish 50% chegirma, o'rinlar soni to'g'ri", () => {
    expect(pilotSetupFee(1_000_000)).toBe(500_000);
    expect(pilotSetupFee(3_000_000)).toBe(1_500_000);
    expect(pricing.pilot.seatsLeft).toBeLessThanOrEqual(pricing.pilot.totalSeats);
    expect(pricing.pilot.seatsLeft).toBeGreaterThanOrEqual(0);
  });

  it("narxlar butun so'm", () => {
    for (const p of pricing.plans) {
      expect(Number.isInteger(p.setupFee) && Number.isInteger(p.monthly)).toBe(true);
    }
  });
});
