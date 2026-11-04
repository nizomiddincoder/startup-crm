"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { annualMonthlyEquivalent, annualPrice, pricing } from "@/lib/pricing";
import { formatSum } from "@/lib/services/money";
import { cn } from "@/lib/utils";

/** 3 paket: ulanish + oylik (yoki yillik) narx, tarkib. Narxlar — lib/pricing.ts. */
export function PricingTable() {
  const [annual, setAnnual] = useState(false);
  const p = m.pricing;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="mx-auto flex items-center gap-1 rounded-xl border bg-card p-1 shadow-card"
        role="radiogroup"
        aria-label={p.monthlyLabel}
      >
        {[false, true].map((isAnnual) => (
          <button
            key={String(isAnnual)}
            type="button"
            role="radio"
            aria-checked={annual === isAnnual}
            onClick={() => setAnnual(isAnnual)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              annual === isAnnual ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {isAnnual ? p.billingAnnual : p.billingMonthly}
            {isAnnual && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  annual ? "bg-primary-foreground/20" : "bg-accent text-accent-foreground",
                )}
              >
                {p.annualBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {pricing.plans.map((plan) => {
          const text = p.plans[plan.id];
          const monthly = annual ? annualMonthlyEquivalent(plan.monthly) : plan.monthly;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-card",
                plan.popular && "border-primary ring-2 ring-primary/20",
              )}
              data-testid="pricing-plan"
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {p.popular}
                </span>
              )}
              <div>
                <h3 className="text-lg font-bold">{text.name}</h3>
                <p className="text-sm text-muted-foreground">{text.tagline}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="flex flex-wrap items-baseline gap-x-1">
                  <span
                    className="text-3xl font-bold text-primary tabular-nums"
                    data-testid="plan-monthly"
                  >
                    {formatSum(monthly)}
                  </span>
                  <span className="text-sm text-muted-foreground">{p.perMonth}</span>
                </p>
                {annual && (
                  <p className="text-xs text-muted-foreground">
                    {p.annualNote.replace("{total}", formatSum(annualPrice(plan.monthly)))}
                  </p>
                )}
                <p className="text-sm">
                  <span className="text-muted-foreground">{p.setup}: </span>
                  <span className="font-semibold tabular-nums" data-testid="plan-setup">
                    {formatSum(plan.setupFee)}
                    {plan.plusEquipment && ` ${p.plusEquipment}`}
                  </span>
                  <span className="text-muted-foreground"> ({p.oneTime})</span>
                </p>
              </div>

              <div className="flex flex-1 flex-col gap-2.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {p.includes}
                </p>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {text.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <span className="font-semibold">{f.label}:</span> {f.value}
                      </span>
                    </li>
                  ))}
                </ul>
                {plan.plusEquipment && (
                  <Link
                    href="/jihozlar"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {p.equipmentLink} →
                  </Link>
                )}
              </div>

              <Link
                href="/register"
                className={buttonVariants({
                  variant: plan.popular ? "default" : "outline",
                  size: "lg",
                })}
              >
                {p.choose}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
