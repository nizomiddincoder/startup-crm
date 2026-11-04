/**
 * Yangi ariza haqida admin'ga Telegram xabari — mavjud bot (TELEGRAM_BOT_TOKEN) orqali,
 * ADMIN_TELEGRAM_CHAT_ID chat'iga. Sozlanmagan bo'lsa — jim o'tib ketadi (null).
 */
import { Api } from "grammy";

export function adminLeadNotifier(): ((html: string) => Promise<void>) | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  const api = new Api(token);
  return async (html) => {
    await api.sendMessage(chatId, html, { parse_mode: "HTML" });
  };
}
