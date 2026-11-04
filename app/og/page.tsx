import { BookOpen, Calculator, Send, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marketing as m } from "@/lib/i18n/marketing.uz";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Open Graph rasmi uchun shablon (1200×630). Faqat lokal: `npm run og` shu sahifani suratga
 * olib, app/opengraph-image.png'ga yozadi (Telegram/Facebook havola ko'rinishi).
 * Ranglar — tokenlar, matnlar — marketing.uz.ts. Brend o'zgarsa: npm run dev → npm run og.
 */
export default function OgTemplate() {
  if (process.env.NODE_ENV === "production") notFound();
  const chips = [
    { icon: BookOpen, label: m.features.items[1]?.title }, // Nasiya
    { icon: Calculator, label: m.features.items[0]?.title }, // Smeta
    { icon: Send, label: m.features.items[5]?.title }, // Telegram bot
  ].filter((c) => c.label);

  return (
    <div
      id="og"
      className="flex h-[630px] w-[1200px] flex-col justify-between overflow-hidden bg-primary p-16 text-primary-foreground"
    >
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-foreground text-primary">
          <ShoppingCart className="size-9" />
        </span>
        <span className="text-4xl font-bold tracking-tight">{m.brand}</span>
      </div>
      <div className="flex flex-col gap-6">
        <h1 className="max-w-[1000px] text-7xl leading-[1.05] font-extrabold tracking-tight">
          {m.seo.pages.home.title}
        </h1>
        <p className="max-w-[900px] text-3xl opacity-90">{m.hero.title}</p>
      </div>
      <div className="flex items-center gap-3">
        {chips.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-2.5 rounded-full bg-primary-foreground/15 px-5 py-3 text-xl font-semibold"
          >
            <Icon className="size-6" />
            {label}
          </span>
        ))}
        <span className="ml-auto rounded-full bg-primary-foreground px-7 py-3 text-2xl font-bold text-primary">
          {m.nav.trial}
        </span>
      </div>
    </div>
  );
}
