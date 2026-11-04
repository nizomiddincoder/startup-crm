import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  Audience,
  Faq,
  Features,
  Guarantee,
  Hero,
  HowItWorks,
  Pains,
  Testimonials,
} from "@/components/marketing/landing-sections";
import { LeadForm } from "@/components/marketing/lead-form";
import { LocalBusinessSchema } from "@/components/marketing/local-business-schema";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Section } from "@/components/marketing/section";
import { marketing as m } from "@/lib/i18n/marketing.uz";

// Layout'dagi "%s — brend" shabloni shu darajadagi sahifaga ta'sir qilmaydi — brend qo'lda
export const metadata: Metadata = {
  ...pageMetadata("home", "/"),
  title: { absolute: `${m.seo.pages.home.title} — ${m.brand}` },
};

export default function LandingPage() {
  return (
    <>
      <LocalBusinessSchema />
      <Hero />
      <Pains />
      <Features />
      <HowItWorks />
      <Audience />
      <Section
        id="narxlar"
        title={m.pricing.title}
        subtitle={m.pricing.subtitle}
        className="bg-card"
      >
        <PricingTable />
        <Link
          href="/narxlar"
          className="self-center text-sm font-semibold text-primary hover:underline"
        >
          {m.pricing.more} →
        </Link>
      </Section>
      <Guarantee />
      <Testimonials />
      <Faq />
      <section id="aloqa" className="scroll-mt-20 px-4 py-14 md:py-20">
        <LeadForm title={m.lead.title} subtitle={m.lead.subtitle} source="website" />
      </section>
    </>
  );
}
