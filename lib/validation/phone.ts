/** Telefon raqami formatlash hamda yagona tezkor kirish kodli kirish (cashier fallback/CTAP) uchun yordamchilar. */

/** Telefon raqamini yagona standart ko'rinishga keltirish. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12) return `+${digits}`;
  return null;
}

/** Telefon raqami regexi (formatlashdan oldin tekshirish uchun). */
export const PHONE_RE = /^\+998\d{9}$/;

/** Telefon yoki kirish kodida bo'lishi mumkin bo'lgan minimal/maksimal uzunlik. */
export const CODE_MIN = 4;
export const CODE_MAX = 6;
