import { Banknote, Check, Monitor, Printer, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { LeadForm } from "@/components/marketing/lead-form";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { pricing, type KitId } from "@/lib/pricing";
import { formatSum } from "@/lib/services/money";

export const metadata: Metadata = pageMetadata("equipment", "/jihozlar");

const itemIcons = [Monitor, Printer, ScanLine, Banknote];

type SearchParams = Promise<{ kit?: string }>;

export default async function EquipmentPage({ searchParams }: { searchParams: SearchParams }) {
  const { kit } = await searchParams;
  const selected = pricing.equipment.kits.find((k) => k.id === kit)?.id as KitId | undefined;
  const e = m.equipment;

  return (
    <>
      <Section title={e.title} subtitle={e.subtitle}>
        <div className="grid gap-4 md:grid-cols-2">
          {pricing.equipment.kits.map((k) => {
            const text = e.kits[k.id];
            return (
              <article
                key={k.id}
                className="flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-card"
                data-testid="equipment-kit"
              >
                <div>
                  <h2 className="text-xl font-bold">{text.name}</h2>
                  <p className="text-sm text-muted-foreground">{text.tagline}</p>
                </div>
                <p className="text-2xl font-bold text-primary" data-testid="kit-price">
                  {k.price === null ? e.askPrice : formatSum(k.price)}
                </p>
                <ul className="flex flex-1 flex-col gap-3 text-sm">
                  {text.items.map((item, i) => {
                    const Icon = itemIcons[i] ?? Check;
                    return (
                      <li key={item.label} className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span>
                          <span className="block font-semibold">{item.label}</span>
                          <span className="text-muted-foreground">{item.value}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {/* Sahifa qayta yuklanadi va formaga "Jihoz: ..." izohi qo'shiladi (JavaScript shart emas) */}
                <Link
                  href={`/jihozlar?kit=${k.id}#buyurtma`}
                  scroll={false}
                  className={buttonVariants({ size: "lg", className: "h-12" })}
                >
                  {e.order}
                </Link>
              </article>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground">{e.have}</p>
      </Section>

      <section id="buyurtma" className="scroll-mt-20 px-4 pb-16">
        <LeadForm
          // key: to'plam almashsa forma yangilanadi
          key={selected ?? "none"}
          title={selected ? `${e.formTitle}: ${e.kits[selected].name}` : e.formTitle}
          subtitle={e.formSubtitle}
          source="website"
          message={selected ? e.kits[selected].message : e.formMessage}
        />
      </section>
    </>
  );
}
