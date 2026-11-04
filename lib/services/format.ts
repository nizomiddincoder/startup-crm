/** Ko'rsatish uchun formatlash (sana, miqdor). Pul uchun — money.ts. */
import { uz } from "@/lib/i18n/uz";

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** Toshkent vaqtida "24.10.2026 21:05" (server qaysi vaqt zonasida bo'lishidan qat'i nazar). */
export function formatDateTime(date: Date): string {
  const d = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return `${formatDate(date)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "09:05" — Toshkent vaqti. */
export function formatTime(date: Date): string {
  const d = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatDate(date: Date): string {
  const d = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** "25-oktabr, 2026" — sahifa sarlavhalari uchun (Toshkent vaqti). */
export function formatLongDate(date: Date): string {
  const d = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return `${d.getUTCDate()}-${uz.months[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}

/** Toshkent sanasi "2026-10-25" ko'rinishida — kunlarni solishtirish va kalit sifatida. */
export function dayKey(date: Date): string {
  const d = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Toshkent vaqtidagi soat (0–23). */
export function tashkentHour(date: Date): number {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).getUTCHours();
}

/** Miqdor:"1.500" → "1,5" (o'zbekcha kasr belgisi — vergul). */
export function formatQuantity(quantity: string | { toString(): string }): string {
  const s = quantity.toString();
  const trimmed = s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  return trimmed.replace(".", ",");
}
