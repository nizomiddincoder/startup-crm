import Link from "next/link";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import type { LegalDoc } from "@/lib/i18n/legal.uz";

/** Huquqiy hujjat sahifasi (matn — lib/i18n/legal.uz.ts, yurist tekshiruvi kerak). */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 md:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">
          {m.legal.updated}: {doc.updated}
        </p>
      </header>
      <p className="leading-relaxed">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">
        ← {m.legal.back}
      </Link>
    </article>
  );
}
