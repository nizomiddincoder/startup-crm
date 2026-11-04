import { BadgePercent, CheckCircle2, Gift, Headset } from "lucide-react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LeadForm } from "@/components/marketing/lead-form";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { t } from "@/lib/i18n/uz";
import { getPlan, pilotSetupFee, pricing } from "@/lib/pricing";
import { formatSum } from "@/lib/services/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata("pilot", "/pilot");

const offerIcons = [Gift, BadgePercent, Headset];
const fill = t;

export default function PilotPage() {
  const p = m.pilot;
  const { totalSeats, seatsLeft, freeMonths, setupDiscountPercent } = pricing.pilot;
  const standard = getPlan("standard");
  const values = {
    total: totalSeats,
    left: seatsLeft,
    months: freeMonths,
    percent: setupDiscountPercent,
    old: formatSum(standard.setupFee),
    new: formatSum(pilotSetupFee(standard.setupFee)),
  };
  const soldOut = seatsLeft <= 0;
  const takenPercent = Math.round(((totalSeats - seatsLeft) / totalSeats) * 100);

  return (
    <>
      <section className="px-4 pt-10 pb-12 md:pt-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
            {fill(p.badge, values)}
          </span>
          <h1 className="text-3xl leading-tight font-bold tracking-tight md:text-5xl">{p.title}</h1>
          <p className="text-lg text-muted-foreground">{fill(p.subtitle, values)}</p>

          <div
            className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-card"
            data-testid="pilot-seats"
          >
            <p className={cn("font-bold", soldOut ? "text-destructive" : "text-primary")}>
              {soldOut ? p.soldOut : fill(p.seatsLeft, values)}
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${takenPercent}%` }} />
            </div>
          </div>

          <a
            href="#pilot-forma"
            className={buttonVariants({ size: "lg", className: "h-12 w-full max-w-md text-base" })}
          >
            {p.formTitle}
          </a>
        </div>
      </section>

      <section className="px-4 pb-12">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {p.offers.map((o, i) => {
            const Icon = offerIcons[i];
            return (
              <div
                key={o.title}
                className="flex flex-col gap-2 rounded-3xl border bg-card p-6 shadow-card"
              >
                <Icon className="size-8 text-primary" strokeWidth={1.5} />
                <h2 className="text-lg font-bold">{fill(o.title, values)}</h2>
                <p className="text-sm text-muted-foreground">{fill(o.text, values)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-card px-4 py-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <h2 className="text-center text-2xl font-bold">{p.whatYouGet}</h2>
          <ul className="flex flex-col gap-3">
            {p.benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pilot-forma" className="scroll-mt-4 px-4 py-14">
        <LeadForm
          title={p.formTitle}
          subtitle={p.formSubtitle}
          source="pilot"
          message={p.message}
        />
      </section>
    </>
  );
}
