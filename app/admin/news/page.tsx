import Link from "next/link";
import { PageHeader } from "@/components/features/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { t, uz } from "@/lib/i18n/uz";
import { formatDateTime } from "@/lib/services/format";
import { listAllNews } from "@/lib/services/news";

/** Admin: yangiliklar ro'yxati (qoralama va chop etilganlar). */
export default async function AdminNewsPage() {
  await requireUser(["SUPER_ADMIN"]);
  const posts = await listAllNews();

  return (
    <main className="flex flex-col gap-5 p-6">
      <PageHeader
        title={uz.news.adminTitle}
        actions={
          <Link href="/admin/news/new" className={buttonVariants()}>
            {uz.news.create}
          </Link>
        }
      />
      {posts.length === 0 ? (
        <p className="text-muted-foreground">{uz.news.empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/admin/news/${p.id}`}
              className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-card hover:border-primary/40"
              data-testid="news-row"
            >
              <Badge variant={p.publishedAt ? "default" : "secondary"}>
                {p.publishedAt ? uz.news.published : uz.news.draft}
              </Badge>
              <span className="font-semibold">{p.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(p.publishedAt ?? p.createdAt)}
                {p.channelSentAt && ` · ${uz.news.channelSent}`}
                {p.ownersSentAt && ` · ${t(uz.news.ownersSent, { count: p.ownersSentCount })}`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
