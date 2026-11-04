/**
 * Har daqiqada Toshkent vaqtini tekshiradi:
 * — ertalab (TELEGRAM_REMINDER_HOUR dan 18:00 gacha): nasiya xulosasi + mijozlarga eslatma;
 * — kechqurun (TELEGRAM_REPORT_HOUR dan keyin): kunlik hisobot.
 * Takrorlanmaslik bazada kafolatlangan (TelegramDispatch), shuning uchun tez-tez tekshirish xavfsiz.
 */
import { tashkentHour } from "@/lib/services/format";
import { MORNING_WINDOW_END_HOUR, telegramConfig } from "@/lib/services/telegram/config";
import { runDailyReports, runMorningDigests, type Send } from "@/lib/services/telegram/dispatch";

const TICK_MS = 60_000;

export function startScheduler(send: Send) {
  const { reportHour, reminderHour } = telegramConfig();
  let running = false;

  async function tick() {
    if (running) return; // oldingi tekshiruv hali tugamagan
    running = true;
    try {
      const now = new Date();
      const hour = tashkentHour(now);
      if (hour >= reminderHour && hour < MORNING_WINDOW_END_HOUR) {
        const n = await runMorningDigests(send, now);
        if (n) console.log(`[bot] ertalabki xabarlar: ${n}`);
      }
      if (hour >= reportHour) {
        const n = await runDailyReports(send, now);
        if (n) console.log(`[bot] kunlik hisobotlar: ${n}`);
      }
    } catch (error) {
      console.error("[bot] rejali xabarlarda xato:", error);
    } finally {
      running = false;
    }
  }

  void tick();
  return setInterval(tick, TICK_MS);
}
