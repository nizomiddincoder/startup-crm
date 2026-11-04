import type { Metadata } from "next";
import { auth } from "@/auth";
import { CookieNotice } from "@/components/marketing/cookie-notice";
import { NewsPoster } from "@/components/marketing/news-poster";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TelegramButton } from "@/components/marketing/telegram-button";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { latestSitePoster } from "@/lib/services/news";
import { homePathForRole } from "@/lib/services/permissions";

export const metadata: Metadata = {
  title: { template: `%s — ${m.brand}`, default: m.brand },
};

// Sotuv sayti (landing): bosh sahifa, narxlar, ariza, huquqiy sahifalar.
// Dastur sahifalaridan alohida qobiq — chap menyu yo'q.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [session, poster] = await Promise.all([auth(), latestSitePoster()]);
  const cabinetHref = session?.user ? homePathForRole(session.user.role) : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      {poster && <NewsPoster post={poster} />}
      <SiteHeader cabinetHref={cabinetHref} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <TelegramButton />
      <CookieNotice />
    </div>
  );
}
