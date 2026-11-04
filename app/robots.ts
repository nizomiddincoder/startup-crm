import type { MetadataRoute } from "next";
import { PRIVATE_PATHS } from "@/lib/seo";
import { siteUrl } from "@/lib/site-config";

// SITE_URL ishga tushirishda o'qiladi (yig'ish paytida emas)
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
