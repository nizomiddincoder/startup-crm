/**
 * Rejali xabarlar: kunlik hisobot (kechqurun) va nasiya xulosasi + mijozlarga eslatma (ertalab).
 * Har do'konga kuniga bir marta — TelegramDispatch qatori "band qilinadi" (unique), shuning uchun
 * bot qayta ishga tushsa yoki ikki nusxa ishlasa ham xabar takrorlanmaydi.
 */
import type { TelegramDispatchKind } from "@prisma/client";
import { db } from "@/lib/db";
import { getOpenDebts } from "../customers";
import { debtStatus, shouldRemind } from "../debt-schedule";
import { isUniqueViolation } from "../errors";
import { dayKey } from "../format";
import { formatCustomerReminder, formatDailyReport, formatMorningDigest } from "./messages";
import { buildDailyReport, buildMorningDigest } from "./reports";

/** Xabar yuborish funksiyasi (botda — grammY, testlarda — soxta). */
export type Send = (chatId: string, html: string) => Promise<void>;

async function claim(tenantId: string, kind: TelegramDispatchKind, now: Date): Promise<boolean> {
  try {
    await db.telegramDispatch.create({ data: { tenantId, kind, day: dayKey(now) } });
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

async function safeSend(send: Send, chatId: string, html: string): Promise<boolean> {
  try {
    await send(chatId, html);
    return true;
  } catch (error) {
    // Masalan, foydalanuvchi botni bloklagan — boshqalarga yuborish to'xtamasin
    console.warn(`[bot] ${chatId} ga yuborilmadi:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/** Hisobot oladigan xodimlar: egasi va menejer, Telegram ulangan. */
function staffRecipients(tenantId: string, pref: "telegramReports" | "telegramReminders") {
  return db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["OWNER", "MANAGER"] },
      telegramChatId: { not: null },
      [pref]: true,
    },
    select: { telegramChatId: true },
  });
}

function activeTenants(tenantIds?: string[]) {
  return db.tenant.findMany({
    where: { isActive: true, id: tenantIds ? { in: tenantIds } : { not: "platform" } },
    select: { id: true, name: true, phone: true },
  });
}

export async function sendDailyReport(tenantId: string, send: Send, now: Date) {
  const recipients = await staffRecipients(tenantId, "telegramReports");
  if (!recipients.length) return 0;
  const html = formatDailyReport(await buildDailyReport(tenantId, now));
  let sent = 0;
  for (const r of recipients) if (await safeSend(send, r.telegramChatId!, html)) sent++;
  return sent;
}

export async function sendMorningDigest(tenantId: string, send: Send, now: Date) {
  const recipients = await staffRecipients(tenantId, "telegramReminders");
  if (!recipients.length) return 0;
  const d = await buildMorningDigest(tenantId, now);
  const html = formatMorningDigest(d.shop, now, d.overdue, d.dueToday);
  let sent = 0;
  for (const r of recipients) if (await safeSend(send, r.telegramChatId!, html)) sent++;
  return sent;
}

/** Botga ulangan mijozlarga nasiya eslatmasi (qoidalar: debt-schedule.ts → shouldRemind). */
export async function sendCustomerReminders(
  tenant: { id: string; name: string; phone: string | null },
  send: Send,
  now: Date,
) {
  const customers = await db.customer.findMany({
    where: { tenantId: tenant.id, isActive: true, telegramChatId: { not: null } },
    select: {
      id: true,
      telegramChatId: true,
      reminderLogs: { orderBy: { sentAt: "desc" }, take: 1, select: { sentAt: true } },
    },
  });
  if (!customers.length) return 0;
  const open = await getOpenDebts(
    tenant.id,
    customers.map((c) => c.id),
  );

  let sent = 0;
  for (const c of customers) {
    const debts = open.get(c.id);
    if (!debts) continue;
    const status = debtStatus(debts, now);
    if (!shouldRemind(status, c.reminderLogs[0]?.sentAt ?? null, now)) continue;
    const html = formatCustomerReminder(tenant.name, tenant.phone, status);
    if (await safeSend(send, c.telegramChatId!, html)) {
      await db.reminderLog.create({ data: { tenantId: tenant.id, customerId: c.id, sentAt: now } });
      sent++;
    }
  }
  return sent;
}

/** Kechqurun: barcha do'konlarga kunlik hisobot (har biriga kuniga bir marta). */
export async function runDailyReports(send: Send, now: Date, tenantIds?: string[]) {
  let sent = 0;
  for (const tenant of await activeTenants(tenantIds)) {
    if (!(await claim(tenant.id, "DAILY_REPORT", now))) continue;
    sent += await sendDailyReport(tenant.id, send, now);
  }
  return sent;
}

/** Ertalab: egasi/menejerga nasiya xulosasi va mijozlarga eslatma (har do'konga kuniga bir marta). */
export async function runMorningDigests(send: Send, now: Date, tenantIds?: string[]) {
  let sent = 0;
  for (const tenant of await activeTenants(tenantIds)) {
    if (!(await claim(tenant.id, "MORNING_DIGEST", now))) continue;
    sent += await sendMorningDigest(tenant.id, send, now);
    sent += await sendCustomerReminders(tenant, send, now);
  }
  return sent;
}
