import { marketing as m } from "@/lib/i18n/marketing.uz";
import { OG_IMAGE } from "@/lib/seo";
import { isPlaceholder, siteUrl, telegramContactUrl } from "@/lib/site-config";

/**
 * Google uchun tuzilgan ma'lumot (schema.org LocalBusiness): nom, tavsif, xizmat hududi, aloqa.
 * "[telefon]" kabi hali to'ldirilmagan qiymatlar chiqarilmaydi.
 */
export function LocalBusinessSchema() {
  const base = siteUrl();
  const f = m.footer;
  const telegram = telegramContactUrl();
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: m.brand,
    description: m.seo.pages.home.description,
    url: base,
    image: `${base}${OG_IMAGE.url}`,
    areaServed: ["Farg'ona", "Andijon", "Namangan"].map((name) => ({
      "@type": "AdministrativeArea",
      name,
    })),
    address: {
      "@type": "PostalAddress",
      addressRegion: "Farg'ona",
      addressCountry: "UZ",
      ...(isPlaceholder(f.address) ? {} : { streetAddress: f.address }),
    },
    keywords: m.seo.keywords.join(", "),
  };
  if (!isPlaceholder(f.phone)) data.telephone = f.phone;
  if (telegram) data.sameAs = [telegram];

  return (
    <script
      type="application/ld+json"
      // "<" belgisi skript tegini yopib qo'ymasligi uchun
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
