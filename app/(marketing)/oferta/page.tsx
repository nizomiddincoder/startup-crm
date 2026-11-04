// ⚠️ Yurist tomonidan tekshirilishi kerak — matn: lib/i18n/legal.uz.ts (izoh faqat kodda)
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/legal-page";
import { offer } from "@/lib/i18n/legal.uz";

export const metadata: Metadata = pageMetadata("offer", "/oferta");

export default function OfferPage() {
  return <LegalPage doc={offer} />;
}
