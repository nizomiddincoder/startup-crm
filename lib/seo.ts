/**
 * Sotuv sayti sahifalari uchun SEO: sarlavha, tavsif, kalit so'zlar, canonical va Open Graph
 * (Telegram/Facebook'da havola ko'rinishi). OG rasm — public/og-image.png (npm run og).
 */
import type { Metadata } from "next";
import { marketing as m } from "@/lib/i18n/marketing.uz";

/** 1200×630, `npm run og` yaratadi. To'liq manzil metadataBase (SITE_URL) bilan quriladi. */
export const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: m.seo.ogAlt };

export type SeoPage = keyof typeof m.seo.pages;

/** Har sahifa: matnlar marketing.uz.ts → seo.pages'da. `path` — canonical manzil ("/narxlar"). */
export function pageMetadata(
  page: SeoPage,
  path: string,
  options: { noindex?: boolean } = {},
): Metadata {
  const { title, description } = m.seo.pages[page];
  return {
    title,
    description,
    keywords: [...m.seo.keywords],
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: m.brand,
      locale: "uz_UZ",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
    ...(options.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Sotuv sayti sahifalari (sitemap.xml shu ro'yxatdan). */
export const PUBLIC_PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/narxlar", priority: 0.9 },
  { path: "/register", priority: 0.9 },
  { path: "/pilot", priority: 0.8 },
  { path: "/jihozlar", priority: 0.7 },
  { path: "/savollar", priority: 0.7 },
  { path: "/aloqa", priority: 0.7 },
  { path: "/yangiliklar", priority: 0.6 },
  { path: "/oferta", priority: 0.3 },
  { path: "/maxfiylik", priority: 0.3 },
];

/** Qidiruv tizimlariga yopiq bo'limlar (robots.txt). */
export const PRIVATE_PATHS = [
  "/admin",
  "/dashboard",
  "/pos",
  "/chek",
  "/news",
  "/media",
  "/api",
  "/logout",
  "/rahmat",
  "/og",
];
