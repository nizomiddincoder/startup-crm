import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { FaqList } from "@/components/marketing/landing-sections";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";

export const metadata: Metadata = pageMetadata("faq", "/savollar");

export default function FaqPage() {
  return (
    <Section title={m.faqPage.title} subtitle={m.faqPage.subtitle}>
      <FaqList items={m.faqPage.items} />
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/aloqa" className={buttonVariants({ size: "lg" })}>
          {m.nav.contact}
        </Link>
        <Link href="/register" className={buttonVariants({ size: "lg", variant: "outline" })}>
          {m.hero.primary}
        </Link>
      </div>
    </Section>
  );
}
