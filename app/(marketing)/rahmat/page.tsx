import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";

export const metadata: Metadata = pageMetadata("thanks", "/rahmat", { noindex: true });

export default function ThanksPage() {
  const tel = `tel:${m.footer.phone.replace(/[^\d+]/g, "")}`;
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="size-16 text-primary" strokeWidth={1.5} aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{m.thanks.title}</h1>
        <p className="text-muted-foreground">{m.thanks.text}</p>
        <p className="text-sm">
          {m.thanks.urgent.split("{phone}")[0]}
          <a href={tel} className="font-semibold text-primary">
            {m.footer.phone}
          </a>
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {m.thanks.back}
        </Link>
      </div>
    </section>
  );
}
