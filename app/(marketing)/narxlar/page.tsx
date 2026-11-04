import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Guarantee } from "@/components/marketing/landing-sections";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Section } from "@/components/marketing/section";
import { marketing as m } from "@/lib/i18n/marketing.uz";

export const metadata: Metadata = pageMetadata("pricing", "/narxlar");

export default function PricingPage() {
  return (
    <>
      <Section title={m.pricing.pageTitle} subtitle={m.pricing.pageSubtitle}>
        <PricingTable />
      </Section>
      <Guarantee />
    </>
  );
}
