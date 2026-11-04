import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LeadForm } from "@/components/marketing/lead-form";
import { marketing as m } from "@/lib/i18n/marketing.uz";

export const metadata: Metadata = pageMetadata("register", "/register");

// Bepul sinov: o'zi ro'yxatdan o'tadi → sinov do'koni (namunaviy katalog bilan) darhol ochiladi
// va egasi kabinetga kiradi. Admin'ga ariza (source=self_signup) va Telegram xabar boradi.
export default function RegisterPage() {
  return (
    <section className="px-4 py-12 md:py-20">
      <LeadForm title={m.lead.trialTitle} subtitle={m.lead.trialSubtitle} source="self_signup" />
    </section>
  );
}
