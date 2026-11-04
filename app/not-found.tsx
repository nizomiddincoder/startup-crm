import type { Metadata } from "next";
import { ErrorScreen } from "@/components/marketing/error-screen";
import { TelegramButton } from "@/components/marketing/telegram-button";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = {
  title: uz.errorPages.notFoundTitle,
  robots: { index: false },
};

// Butun sayt uchun 404 (sotuv sayti ham, dastur ham)
export default function NotFound() {
  return (
    <>
      <ErrorScreen
        code="404"
        title={uz.errorPages.notFoundTitle}
        text={uz.errorPages.notFoundText}
      />
      <TelegramButton />
    </>
  );
}
