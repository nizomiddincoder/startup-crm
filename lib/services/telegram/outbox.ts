/**
 * Sayt (web jarayoni) tomonidan Telegramga xabar yuborish — bot tokeni orqali to'g'ridan-to'g'ri.
 * Tugmalarga javobni bot jarayoni (bot/handlers.ts) qabul qiladi.
 */
import { Api, InputFile } from "grammy";
import { t, uz } from "@/lib/i18n/uz";
import { formatDateTime } from "../format";
import { telegramConfig } from "./config";
import { escapeHtml } from "./messages";

function api() {
  const { token } = telegramConfig();
  return token ? new Api(token) : null;
}

/** Kirish so'rovi: "✅ Tasdiqlash / ❌ Bu men emas" tugmalari bilan. */
export async function sendLoginRequest(
  user: { name: string; tenantName: string; telegramChatId: string },
  challengeId: string,
  now = new Date(),
) {
  const client = api();
  if (!client) throw new Error("TELEGRAM_BOT_TOKEN yo'q");
  await client.sendMessage(
    user.telegramChatId,
    t(uz.bot.loginRequest, {
      name: escapeHtml(user.name),
      shop: escapeHtml(user.tenantName),
      time: formatDateTime(now),
    }),
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: uz.bot.loginApprove, callback_data: `login:ok:${challengeId}` },
            { text: uz.bot.loginDeny, callback_data: `login:no:${challengeId}` },
          ],
        ],
      },
    },
  );
}

/** Yangiliklar uchun yuboruvchi: rasm bo'lsa — rasm + izoh (1024 belgigacha), bo'lmasa — matn. */
export function newsSender() {
  const client = api();
  if (!client) return null;
  return {
    send: async (chatId: string, html: string, image?: { data: Buffer; mime: string }) => {
      if (image && html.length <= 1024) {
        await client.sendPhoto(chatId, new InputFile(image.data, "yangilik.webp"), {
          caption: html,
          parse_mode: "HTML",
        });
        return;
      }
      await client.sendMessage(chatId, html, { parse_mode: "HTML" });
    },
    pause: () => new Promise<void>((resolve) => setTimeout(resolve, 60)),
  };
}

/** Bitta chat'ga oddiy HTML xabar. Bot sozlanmagan bo'lsa — false. */
export async function sendTelegram(chatId: string, html: string) {
  const client = api();
  if (!client) return false;
  await client.sendMessage(chatId, html, { parse_mode: "HTML" });
  return true;
}

/** Platforma admini chat'iga (ADMIN_TELEGRAM_CHAT_ID). Sozlanmagan bo'lsa — jim o'tadi. */
export async function sendToAdmin(html: string) {
  const client = api();
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID?.trim();
  if (!client || !chatId) return false;
  await client.sendMessage(chatId, html, { parse_mode: "HTML" });
  return true;
}
