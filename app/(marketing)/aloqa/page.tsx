import { Clock, MapPin, Phone, Send } from "lucide-react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LeadForm } from "@/components/marketing/lead-form";
import { LocalBusinessSchema } from "@/components/marketing/local-business-schema";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { telegramContactUrl } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata("contact", "/aloqa");

export default function ContactPage() {
  const c = m.contact;
  const f = m.footer;
  const tel = `tel:${f.phone.replace(/[^\d+]/g, "")}`;
  const telegramUrl = telegramContactUrl();
  const rows = [
    { icon: Phone, label: f.phoneLabel, value: f.phone, href: tel },
    { icon: Send, label: f.telegramLabel, value: f.telegram, href: telegramUrl ?? undefined },
    { icon: Clock, label: c.workHoursLabel, value: c.workHours },
    { icon: MapPin, label: f.addressLabel, value: f.address },
  ];

  return (
    <>
      <LocalBusinessSchema />
      <Section title={c.title} subtitle={c.subtitle}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-card">
            <ul className="flex flex-col gap-4">
              {rows.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    {href ? (
                      <a href={href} className="font-semibold hover:text-primary" rel="noreferrer">
                        {value}
                      </a>
                    ) : (
                      <span className="font-semibold">{value}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <a href={tel} className={buttonVariants({ size: "lg", className: "h-12 sm:flex-1" })}>
                <Phone className="size-4" />
                {c.call}
              </a>
              {telegramUrl && (
                <a
                  href={telegramUrl}
                  rel="noreferrer"
                  className={buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className: "h-12 sm:flex-1",
                  })}
                >
                  <Send className="size-4" />
                  {c.write}
                </a>
              )}
            </div>
          </div>

          {/* Xarita: og'ir xarita skripti yuklanmaydi — faqat tashqi havola */}
          <div
            className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border bg-accent/60 p-6 text-center text-accent-foreground"
            data-testid="map-slot"
          >
            <MapPin className="size-10 opacity-70" strokeWidth={1.5} />
            <p className="font-semibold">{f.address}</p>
            {c.mapUrl ? (
              <a
                href={c.mapUrl}
                rel="noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                {c.mapOpen}
              </a>
            ) : (
              <p className="text-sm">{c.mapPlaceholder}</p>
            )}
          </div>
        </div>
      </Section>
      <section className="px-4 pb-16">
        <LeadForm
          title={c.formTitle}
          subtitle={c.formSubtitle}
          source="website"
          message={c.formMessage}
        />
      </section>
    </>
  );
}
