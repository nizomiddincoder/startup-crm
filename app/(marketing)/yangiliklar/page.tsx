import type { Metadata } from "next";
import Link from "next/link";
import { NewsBody } from "@/components/marketing/news-body";
import { Section } from "@/components/marketing/section";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { formatLongDate } from "@/lib/services/format";
import { listPublishedNews } from "@/lib/services/news";

export const metadata: Metadata = {
  title: m.news.title,
  description: m.news.metaDescription,
  alternates: { canonical: "/yangiliklar" },
};

// Yangilik chop etilishi bilan ko'rinsin
export const dynamic = "force-dynamic";

export default async function NewsListPage() {
  const posts = await listPublishedNews("site");
  return (
    <Section title={m.news.title} subtitle={m.news.subtitle}>
      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground">{m.news.empty}</p>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {posts.map((p) => (
            <article
              key={p.id}
              className="flex flex-col gap-3 rounded-3xl border bg-card p-6 shadow-card"
              data-testid="site-news"
            >
              {p.imageMime && (
                // eslint-disable-next-line @next/next/no-img-element -- o'z route'imizdan
                <img
                  src={`/media/news/${p.id}?v=${p.updatedAt.getTime()}`}
                  alt=""
                  loading="lazy"
                  className="max-h-72 w-full rounded-2xl object-cover"
                />
              )}
              <time className="text-sm text-muted-foreground">
                {formatLongDate(p.publishedAt!)}
              </time>
              <h2 className="text-xl font-bold">
                <Link href={`/yangiliklar/${p.id}`} className="hover:text-primary">
                  {p.title}
                </Link>
              </h2>
              <NewsBody
                text={p.body.length > 400 ? `${p.body.slice(0, 400)}…` : p.body}
                className="flex flex-col gap-2 text-muted-foreground"
              />
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}
