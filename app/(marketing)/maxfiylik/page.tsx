// ⚠️ Yurist tomonidan tekshirilishi kerak — matn: lib/i18n/legal.uz.ts (izoh faqat kodda)
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/legal-page";
import { privacy } from "@/lib/i18n/legal.uz";

export const metadata: Metadata = pageMetadata("privacy", "/maxfiylik");

export default function PrivacyPage() {
  return <LegalPage doc={privacy} />;
}
