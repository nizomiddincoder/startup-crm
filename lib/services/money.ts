/**
 * Pul har doim butun son (Int) ko'rinishida, so'mda saqlanadi.
 * Bu fayl faqat formatlash va tekshiruv uchun.
 */
import { uz } from "@/lib/i18n/uz";

/** Maksimal narx — PostgreSQL Int chegarasidan (2 147 483 647) ancha past. */
export const MAX_PRICE = 1_000_000_000;

/**
 * Foydalanuvchi yozgan summani butun songa aylantiradi: "125 000", "125,000", "125000 so'm" → 125000.
 * Kasr yoki noto'g'ri qiymat bo'lsa null.
 */
export function parseSum(input: string): number | null {
  const cleaned = input.replace(/so['ʻ’`]?m/gi, "").replace(/[\s,_]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

/** Summani valyutasiz, minglarni bo'sh joy bilan ajratib yozadi: 1250000 → "1 250 000". */
export function formatAmount(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new Error("Pul miqdori butun son bo'lishi kerak");
  }
  const formatted = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${amount < 0 ? "-" : ""}${formatted}`;
}

export function formatSum(amount: number): string {
  return `${formatAmount(amount)} ${uz.common.currency}`;
}
