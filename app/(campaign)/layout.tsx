import { Phone } from "lucide-react";
import type { Metadata } from "next";
import { CookieNotice } from "@/components/marketing/cookie-notice";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Logo } from "@/components/marketing/site-header";
import { TelegramButton } from "@/components/marketing/telegram-button";
import { marketing as m } from "@/lib/i18n/marketing.uz";

export const metadata: Metadata = {
  title: { template: `%s — ${m.brand}`, default: m.brand },
};

// Reklama qo'nish sahifalari (/pilot): menyusiz — tashrifchi faqat taklif va formani ko'radi.
export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  const tel = `tel:${m.footer.phone.replace(/[^\d+]/g, "")}`;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <a
            href={tel}
            className="flex items-center gap-2 text-sm font-semibold hover:text-primary"
          >
            <Phone className="size-4 text-primary" aria-hidden />
            {m.footer.phone}
          </a>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <TelegramButton />
      <CookieNotice />
    </div>
  );
}
