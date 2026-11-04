import { PageHeader } from "@/components/features/layout/page-header";
import { NewsBody } from "@/components/marketing/news-body";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { formatLongDate } from "@/lib/services/format";
import { listPublishedNews, markNewsSeen } from "@/lib/services/news";

/** Dastur ichidagi yangiliklar oynasi. Ochilganda — hammasi o'qilgan hisoblanadi. */
export default async function AppNewsPage() {
  const user = await requireUser();
  const [posts, seenBefore] = await Promise.all([
    listPublishedNews("app"),
    // O'qilmaganlarni belgilash uchun avvalgi vaqt (keyin yangilanadi)
    import("@/lib/db").then(({ db }) =>
      db.user.findUnique({ where: { id: user.id }, select: { newsSeenAt: true } }),
    ),
  ]);
  await markNewsSeen(user.id);
  const since = seenBefore?.newsSeenAt ?? null;

  return (
    <main className="flex flex-col gap-5 p-4 md:p-6">
      <PageHeader title={uz.news.title} />
      {posts.length === 0 ? (
        <p className="text-muted-foreground">{uz.news.empty}</p>
      ) : (
        <div className="flex max-w-3xl flex-col gap-4">
          {posts.map((p) => {
            const fresh = !since || (p.publishedAt && p.publishedAt > since);
            return (
              <article
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card"
                data-testid="app-news"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <time>{formatLongDate(p.publishedAt!)}</time>
                  {fresh && <Badge>{uz.news.unread.replace("{count} ta ", "")}</Badge>}
                </div>
                <h2 className="text-lg font-bold">{p.title}</h2>
                {p.imageMime && (
                  // eslint-disable-next-line @next/next/no-img-element -- o'z route'imizdan
                  <img
                    src={`/media/news/${p.id}?v=${p.updatedAt.getTime()}`}
                    alt=""
                    loading="lazy"
                    className="max-h-72 rounded-xl border object-cover"
                  />
                )}
                <NewsBody text={p.body} className="flex flex-col gap-2 text-sm leading-relaxed" />
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
