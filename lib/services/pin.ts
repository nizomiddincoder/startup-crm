/**
 * Kassir PIN kodi: 4 xonali raqam. Bazada PIN o'zi emas, HMAC-SHA256 "kalit" saqlanadi
 * (AUTH_SECRET bilan) — shuning uchun PIN bazadan o'qilmaydi va u butun tizimda yagona bo'ladi.
 */
import crypto from "node:crypto";

export const PIN_RE = /^\d{4}$/;

export function isValidPin(value: unknown): value is string {
  return typeof value === "string" && PIN_RE.test(value);
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET o'rnatilmagan");
  return s;
}

/** PIN'dan bazada saqlanadigan kalit (deterministik, teskari hisoblab bo'lmaydi). */
export function pinKey(pin: string): string {
  return crypto.createHmac("sha256", secret()).update(`pin:${pin}`).digest("hex");
}

export function randomPin(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, "0");
}

/**
 * Hali hech kimda bo'lmagan PIN. `isTaken` — shu kalit bazada bormi (tekshiruv chaqiruvchida).
 * Juda kam holda 50 ta urinishda ham topilmasa — xato.
 */
export async function uniquePin(
  isTaken: (key: string) => Promise<boolean>,
): Promise<{ pin: string; key: string }> {
  for (let i = 0; i < 50; i++) {
    const pin = randomPin();
    const key = pinKey(pin);
    if (!(await isTaken(key))) return { pin, key };
  }
  throw new Error("Bo'sh PIN topilmadi");
}
