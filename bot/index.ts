/**
 * Telegram bot — alohida jarayon: npm run bot
 * Lokal: .env'da TELEGRAM_BOT_TOKEN bo'lishi kerak. Railway'da — alohida servis (CLAUDE.md, P7).
 */
import { Bot } from "grammy";

try {
  // Lokal ishlab chiqishda .env'ni o'qiydi (Railway'da o'zgaruvchilar muhitdan keladi)
  process.loadEnvFile?.(".env");
} catch {
  // .env yo'q — muhit o'zgaruvchilari ishlatiladi
}

async function main() {
  const { telegramConfig } = await import("@/lib/services/telegram/config");
  const { botCommands, registerHandlers } = await import("./handlers");
  const { startScheduler } = await import("./scheduler");

  const config = telegramConfig();
  if (!config.token) {
    console.error(
      "[bot] TELEGRAM_BOT_TOKEN yo'q. @BotFather'da bot yarating va tokenni .env fayliga yozing.",
    );
    process.exit(1);
  }

  const bot = new Bot(config.token);
  const send = registerHandlers(bot);
  bot.catch((err) => console.error("[bot] xato:", err.error));

  await bot.api.setMyCommands(botCommands);
  const timer = startScheduler(send);

  const stop = async () => {
    clearInterval(timer);
    await bot.stop();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  console.log(
    `[bot] ishga tushdi. Hisobot: ${config.reportHour}:00, eslatmalar: ${config.reminderHour}:00 (Toshkent)`,
  );
  await bot.start({ drop_pending_updates: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
