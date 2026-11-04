import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsBody } from "@/components/marketing/news-body";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { formatLongDate } from "@/lib/services/format";
import { getPublishedNews } from "@/lib/services/news";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await getPublishedNews((await params).id, "site");
  if (!post) return { title: m.news.title };
  const description = post.body.slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/yangiliklar/${post.id}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      images: post.imageMime ? [`/media/news/${post.id}`] : ["/og-image.png"],
    },
  };
}

export default async function NewsPostPage({ params }: { params: Params }) {
  const post = await getPublishedNews((await params).id, "site");
  if (!post) notFound();
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-12 md:py-16">
      <Link href="/yangiliklar" className="text-sm font-semibold text-primary hover:underline">
        ← {m.news.back}
      </Link>
      <time className="text-sm text-muted-foreground">{formatLongDate(post.publishedAt!)}</time>
      <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">{post.title}</h1>
      {post.imageMime && (
        // eslint-disable-next-line @next/next/no-img-element -- o'z route'imizdan
        <img
          src={`/media/news/${post.id}?v=${post.updatedAt.getTime()}`}
          alt=""
          className="w-full rounded-3xl border object-cover"
        />
      )}
      <NewsBody text={post.body} className="flex flex-col gap-4 text-lg leading-relaxed" />
    </article>
  );
}
