/**
 * Sotuv sayti sozlamalari muhit o'zgaruvchilaridan (.env / Railway Variables).
 * Bo'sh bo'lsa — tegishli narsa saytda umuman chiqmaydi (skript ham yuklanmaydi).
 */
import { marketing } from "@/lib/i18n/marketing.uz";

/** Saytning asosiy manzili (canonical, sitemap, OG rasm). Masalan: https://kassa.uz */
export function siteUrl(): string {
  const raw = process.env.SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

const httpsUrl = (v: string | undefined) => {
  const value = v?.trim();
  return value && /^https:\/\/\S+$/.test(value) ? value : null;
};

/** "Telegramda yozish" tugmasi havolasi (https://t.me/...). */
export function telegramContactUrl(): string | null {
  return httpsUrl(process.env.TELEGRAM_CONTACT_URL) ?? httpsUrl(marketing.footer.telegramUrl);
}

/** Meta Pixel va Google Analytics 4 ID'lari. Faqat harf, raqam va "-" qabul qilinadi. */
export function analyticsIds(): { pixelId?: string; gaId?: string } {
  const clean = (v: string | undefined) => {
    const value = v?.trim();
    return value && /^[A-Za-z0-9-]{4,40}$/.test(value) ? value : undefined;
  };
  return {
    pixelId: clean(process.env.META_PIXEL_ID),
    gaId: clean(process.env.GA_MEASUREMENT_ID),
  };
}

/** "[telefon]" kabi hali to'ldirilmagan qiymat — sxema va havolalarga chiqarilmaydi. */
export function isPlaceholder(value: string | undefined | null): boolean {
  return !value || /^\[.*\]$/.test(value.trim());
}
