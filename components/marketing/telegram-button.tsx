import { Send } from "lucide-react";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { telegramContactUrl } from "@/lib/site-config";

/**
 * Pastki o'ng burchakdagi "Telegramda yozish" tugmasi (sayt sahifalari va 404).
 * Havola: TELEGRAM_CONTACT_URL (bo'sh bo'lsa — tugma chiqmaydi).
 * Telefonda faqat ikonka (matn ekranni to'smasin), kattaroq ekranda — ikonka + matn.
 */
export function TelegramButton() {
  const url = telegramContactUrl();
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={m.telegramButton}
      data-testid="telegram-button"
      className="fixed right-4 bottom-4 z-50 flex size-14 items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none sm:size-auto sm:px-5 sm:py-3.5"
    >
      <Send className="size-6 sm:size-5" aria-hidden />
      <span className="hidden text-sm font-semibold sm:inline">{m.telegramButton}</span>
    </a>
  );
}
