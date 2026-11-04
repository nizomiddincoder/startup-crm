import { PageHeader } from "@/components/features/layout/page-header";
import { NewsForm } from "@/components/features/news/news-form";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

export default async function NewNewsPage() {
  await requireUser(["SUPER_ADMIN"]);
  return (
    <main className="flex flex-col gap-5 p-6">
      <PageHeader title={uz.news.create} />
      <NewsForm
        id={null}
        imageUrl={null}
        published={false}
        channelConfigured={!!process.env.TELEGRAM_NEWS_CHANNEL?.trim()}
        defaults={{
          title: "",
          body: "",
          onSite: true,
          onApp: true,
          toChannel: true,
          toOwners: true,
        }}
      />
    </main>
  );
}
