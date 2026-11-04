/**
 * Reklama belgilari (UTM va ref): saytga ?utm_source=instagram&utm_campaign=smeta yoki ?ref=PILOT
 * bilan kirilsa — 30 kun cookie'da saqlanadi va ariza yuborilganda leadga yoziladi.
 * Toza funksiyalar: brauzerda (cookie yozish) va serverda (o'qish) ishlatiladi.
 */
import { attributionSchema, type Attribution } from "@/lib/validation/attribution";

export const ATTRIBUTION_COOKIE = "lead_attr";
export const ATTRIBUTION_MAX_AGE_DAYS = 30;

/** URL parametrlaridan belgilarni oladi. `utm_term` va `keyword` — ikkalasi ham kalit so'z. */
export function attributionFromSearch(search: string | URLSearchParams): Attribution | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const raw = {
    utmSource: params.get("utm_source") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    keyword: params.get("utm_term") ?? params.get("keyword") ?? undefined,
    ref: params.get("ref") ?? undefined,
  };
  const parsed = attributionSchema.parse(raw);
  return Object.values(parsed).some(Boolean) ? parsed : null;
}

export function serializeAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

/** Cookie qiymatini o'qiydi; buzilgan yoki soxta qiymat — bo'sh belgilar. */
export function parseAttributionCookie(value: string | undefined): Attribution {
  if (!value) return attributionSchema.parse({});
  try {
    return attributionSchema.parse(JSON.parse(decodeURIComponent(value)));
  } catch {
    return attributionSchema.parse({});
  }
}

/** Ro'yxat va hisobotlarda ko'rsatish uchun qisqa manba nomi. */
export function sourceLabel(a: {
  utmSource?: string | null;
  utmCampaign?: string | null;
  ref?: string | null;
}): string | null {
  if (a.utmSource) return a.utmCampaign ? `${a.utmSource} / ${a.utmCampaign}` : a.utmSource;
  if (a.ref) return `ref: ${a.ref}`;
  return null;
}
