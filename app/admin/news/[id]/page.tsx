import { notFound } from "next/navigation";
import { PageHeader } from "@/components/features/layout/page-header";
import { NewsForm } from "@/components/features/news/news-form";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { t, uz } from "@/lib/i18n/uz";
import { formatDateTime } from "@/lib/services/format";
import { getNews } from "@/lib/services/news";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const post = await getNews(id);
  if (!post) notFound();

  return (
    <main className="flex flex-col gap-5 p-6">
      <PageHeader title={uz.news.editTitle} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={post.publishedAt ? "default" : "secondary"}>
          {post.publishedAt ? uz.news.published : uz.news.draft}
        </Badge>
        {post.publishedAt && (
          <span className="text-muted-foreground">{formatDateTime(post.publishedAt)}</span>
        )}
        {post.channelSentAt && <Badge variant="outline">{uz.news.channelSent}</Badge>}
        {post.ownersSentAt && (
          <Badge variant="outline">{t(uz.news.ownersSent, { count: post.ownersSentCount })}</Badge>
        )}
      </div>
      <NewsForm
        id={post.id}
        imageUrl={
          post.imageMime ? `/media/news/${post.id}?admin=1&v=${post.updatedAt.getTime()}` : null
        }
        published={!!post.publishedAt}
        channelConfigured={!!process.env.TELEGRAM_NEWS_CHANNEL?.trim()}
        defaults={{
          title: post.title,
          body: post.body,
          onSite: post.onSite,
          onApp: post.onApp,
          toChannel: post.toChannel,
          toOwners: post.toOwners,
        }}
      />
    </main>
  );
}
