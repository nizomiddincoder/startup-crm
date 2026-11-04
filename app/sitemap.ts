import type { MetadataRoute } from "next";
import { PUBLIC_PAGES } from "@/lib/seo";
import { siteUrl } from "@/lib/site-config";

// SITE_URL ishga tushirishda o'qiladi (yig'ish paytida emas)
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_PAGES.map(({ path, priority }) => ({
    url: `${base}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority,
  }));
}
