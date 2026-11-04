/**
 * NARXLAR — BITTA JOYDA. Narxni o'zgartirish uchun faqat shu faylni tahrirlang (so'mda, butun son).
 * Paket va jihozlarning matnli tavsifi: lib/i18n/marketing.uz.ts (pricingPage, equipment).
 */

export type PlanId = "standard" | "custom" | "turnkey";
export type KitId = "econom" | "standard";

export const pricing = {
  /** Yillik to'lovda necha oy bepul (12 oy o'rniga 12 − N oy to'lanadi) */
  annualFreeMonths: 2,

  plans: [
    { id: "standard", setupFee: 1_000_000, monthly: 390_000, popular: false, plusEquipment: false },
    { id: "custom", setupFee: 3_000_000, monthly: 490_000, popular: true, plusEquipment: false },
    // Kalit topshirish: ulanish + jihoz narxi (jihoz /jihozlar sahifasidagi to'plam narxida)
    { id: "turnkey", setupFee: 3_000_000, monthly: 490_000, popular: false, plusEquipment: true },
  ] as const satisfies readonly {
    id: PlanId;
    setupFee: number;
    monthly: number;
    popular: boolean;
    plusEquipment: boolean;
  }[],

  equipment: {
    // null — saytda "Narxni so'rang" chiqadi. Narx aniq bo'lsa, so'mda yozing (masalan 6_500_000)
    kits: [
      { id: "econom", price: null },
      { id: "standard", price: null },
    ] as { id: KitId; price: number | null }[],
  },

  pilot: {
    totalSeats: 10,
    /** Qolgan o'rinlar — har yangi pilot do'kon ulanganda kamaytiring */
    seatsLeft: 10,
    freeMonths: 1,
    /** Ulanish narxidan chegirma, foizda */
    setupDiscountPercent: 50,
  },
};

/** Yillik to'lov: oylik × (12 − bepul oylar). */
export function annualPrice(monthly: number): number {
  return monthly * (12 - pricing.annualFreeMonths);
}

/** Yillik to'lovda oyiga to'g'ri keladigan narx (ming so'mgacha yaxlitlangan). */
export function annualMonthlyEquivalent(monthly: number): number {
  return Math.round(annualPrice(monthly) / 12 / 1000) * 1000;
}

/** Pilot uchun ulanish narxi (chegirma bilan). */
export function pilotSetupFee(setupFee: number): number {
  return Math.round((setupFee * (100 - pricing.pilot.setupDiscountPercent)) / 100);
}

export function getPlan(id: PlanId) {
  return pricing.plans.find((p) => p.id === id)!;
}
