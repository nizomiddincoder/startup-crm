/** Telegram sozlamalari (muhit o'zgaruvchilaridan). */

function hour(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isInteger(v) && v >= 0 && v <= 23 ? v : fallback;
}

export function telegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN?.trim() || null,
    /** Bot nomi @ belgisiz, masalan "kassa_demo_bot" — saytda ulanish havolasi uchun */
    username: process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") || null,
    /** Kunlik hisobot soati (Toshkent vaqti) */
    reportHour: hour("TELEGRAM_REPORT_HOUR", 20),
    /** Nasiya xulosasi va mijozlarga eslatma soati */
    reminderHour: hour("TELEGRAM_REMINDER_HOUR", 10),
  };
}

/** Mijozlarga eslatma kech kechqurun yuborilmasin: ertalabki xabar shu soatgacha. */
export const MORNING_WINDOW_END_HOUR = 18;
