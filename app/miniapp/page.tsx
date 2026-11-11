import type { Metadata } from "next";
import Script from "next/script";
import { MiniShop } from "@/components/features/miniapp/mini-shop";
import { uz } from "@/lib/i18n/uz";

// Telegram Mini App: do'kon ilovasi. Telegram ichida (iframe) ochiladi — frame-ancestors next.config.ts'da.
export const metadata: Metadata = { title: uz.miniapp.title, robots: { index: false } };

export default function MiniAppPage() {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <MiniShop />
    </>
  );
}
