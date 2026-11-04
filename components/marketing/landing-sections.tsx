import { ChevronDown, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { cn } from "@/lib/utils";
import { marketingIcons } from "./icons";
import { ScreenSlot } from "./screen-slot";
import { Section } from "./section";

export function Hero() {
  return (
    <section className="px-4 pt-10 pb-14 md:pt-20 md:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl leading-tight font-bold tracking-tight md:text-5xl">
            {m.hero.title}
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">{m.hero.subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonVariants({ size: "lg", className: "h-12 text-base" })}
            >
              {m.hero.primary}
            </Link>
            <a
              href="#aloqa"
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "h-12 border-primary text-base text-primary",
              })}
            >
              {m.hero.secondary}
            </a>
          </div>
        </div>
        <ScreenSlot
          src="/screens/hero.png"
          alt={m.hero.screenAlt}
          label={m.features.screenPlaceholder}
          priority
        />
      </div>
    </section>
  );
}

export function Pains() {
  return (
    <Section title={m.pains.title} className="bg-card">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {m.pains.items.map((p) => {
          const Icon = marketingIcons[p.icon];
          return (
            <div key={p.title} className="flex flex-col gap-3 rounded-2xl border bg-background p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Icon className="size-5" />
              </span>
              <h3 className="font-bold">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function Features() {
  return (
    <Section id="imkoniyatlar" title={m.features.title} subtitle={m.features.subtitle}>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {m.features.items.map((f) => {
          const Icon = marketingIcons[f.icon];
          return (
            <article
              key={f.title}
              className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-card"
              data-testid="feature"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-bold">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{f.text}</p>
              <ScreenSlot
                src={f.screen}
                alt={f.title}
                label={m.features.screenPlaceholder}
                hidePlaceholderOnMobile
                className="mt-auto"
              />
            </article>
          );
        })}
      </div>
    </Section>
  );
}

export function HowItWorks() {
  return (
    <Section title={m.how.title} className="bg-card">
      <ol className="grid gap-4 md:grid-cols-3">
        {m.how.steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-2xl border bg-background p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-bold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Audience() {
  return (
    <Section title={m.audience.title}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {m.audience.items.map((a) => {
          const Icon = marketingIcons[a.icon];
          return (
            <div
              key={a.title}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center",
                a.active
                  ? "border-primary bg-card shadow-card ring-2 ring-primary/20"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  a.active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {a.active ? m.audience.main : m.audience.soon}
              </span>
              <Icon className={cn("mt-3 size-8", a.active && "text-primary")} strokeWidth={1.5} />
              <span className="text-sm font-semibold">{a.title}</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function Guarantee() {
  return (
    <section className="px-4 py-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-3xl bg-primary p-8 text-center text-primary-foreground md:flex-row md:text-left">
        <ShieldCheck className="size-14 shrink-0" strokeWidth={1.5} aria-hidden />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold md:text-2xl">{m.guarantee.title}</h2>
          <p>{m.guarantee.text}</p>
        </div>
      </div>
    </section>
  );
}

/** Faqat haqiqiy fikrlar bo'lsa ko'rinadi (marketing.uz.ts → testimonials.items). */
export function Testimonials() {
  const items = m.testimonials.items;
  if (items.length === 0) return null;
  return (
    <Section title={m.testimonials.title}>
      <div className="grid gap-4 md:grid-cols-3" data-testid="testimonials">
        {items.map((t) => (
          <figure
            key={t.name}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card"
          >
            <blockquote className="text-sm">«{t.text}»</blockquote>
            <figcaption className="text-sm">
              <span className="font-bold">{t.name}</span>
              <span className="block text-muted-foreground">{t.shop}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

/** Savol-javob akkordeoni (JavaScript'siz, <details>). */
export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3" data-testid="faq-list">
      {items.map((f) => (
        <details key={f.q} className="group rounded-2xl border bg-card p-5 shadow-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Bosh sahifada — birinchi 4 ta savol va /savollar havolasi. */
export function Faq() {
  return (
    <Section id="savollar" title={m.faqPage.title}>
      <FaqList items={m.faqPage.items.slice(0, 4)} />
      <Link
        href="/savollar"
        className="self-center text-sm font-semibold text-primary hover:underline"
      >
        {m.faqPage.more} →
      </Link>
    </Section>
  );
}
