/**
 * Telegram ulanishlari — kod va havolasiz: odam botga O'Z raqamini yuboradi (Telegram tasdiqlagan
 * kontakt). Xodim — User.phone bo'yicha (User.telegramChatId), mijoz — barcha do'konlardagi shu
 * raqamli mijozlar (Customer.telegramChatId). Eski bir martalik kod (/start <kod>) ham ishlaydi.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/validation/auth";
import { getAccountBalances, getOpenDebts } from "../customers";
import { debtStatus } from "../debt-schedule";

export const LINK_CODE_TTL_MS = 15 * 60 * 1000;

export async function createLinkCode(tenantId: string, userId: string): Promise<string> {
  const code = randomBytes(12).toString("base64url");
  // Eski kodlar keraksiz — har foydalanuvchida bittadan ortiq faol kod bo'lmasin
  await db.telegramLinkCode.deleteMany({ where: { tenantId, userId } });
  await db.telegramLinkCode.create({
    data: { code, tenantId, userId, expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS) },
  });
  return code;
}

/** Kod to'g'ri va muddati o'tmagan bo'lsa — chat'ni xodimga bog'laydi. */
export async function consumeLinkCode(code: string, chatId: string) {
  return db.$transaction(async (tx) => {
    const link = await tx.telegramLinkCode.findUnique({
      where: { code },
      include: { user: { include: { tenant: { select: { name: true } } } } },
    });
    if (!link || link.expiresAt < new Date() || !link.user.isActive) return null;

    // Bitta Telegram akkaunt — bitta xodim (oldingi bog'lanish bo'lsa, uziladi)
    await tx.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
    await tx.user.update({ where: { id: link.userId }, data: { telegramChatId: chatId } });
    await tx.telegramLinkCode.delete({ where: { code } });
    return { name: link.user.name, shop: link.user.tenant.name };
  });
}

/**
 * Xodimni raqami bo'yicha ulaydi. ISTISNO: telefon butun tizimda yagona, qidiruv tenantsiz —
 * odam faqat O'Z raqamini (Telegram tasdiqlagan kontakt) yuboradi.
 */
export async function linkStaffByPhone(rawPhone: string, chatId: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;
  const user = await db.user.findFirst({
    where: { phone, isActive: true, tenant: { isActive: true } },
    select: { id: true, name: true, role: true, tenant: { select: { name: true } } },
  });
  if (!user) return null;
  await db.$transaction([
    // Bitta Telegram akkaunt — bitta xodim (oldingi bog'lanish bo'lsa, uziladi)
    db.user.updateMany({
      where: { telegramChatId: chatId, id: { not: user.id } },
      data: { telegramChatId: null },
    }),
    db.user.update({ where: { id: user.id }, data: { telegramChatId: chatId } }),
  ]);
  return { name: user.name, role: user.role, shop: user.tenant.name };
}

export async function unlinkUser(tenantId: string, userId: string) {
  await db.user.updateMany({ where: { id: userId, tenantId }, data: { telegramChatId: null } });
}

export async function getTelegramPrefs(tenantId: string, userId: string) {
  const user = await db.user.findFirstOrThrow({
    where: { id: userId, tenantId },
    select: {
      telegramChatId: true,
      telegramReports: true,
      telegramReminders: true,
      telegramLoginConfirm: true,
    },
  });
  return {
    linked: !!user.telegramChatId,
    reports: user.telegramReports,
    reminders: user.telegramReminders,
    loginConfirm: user.telegramLoginConfirm,
  };
}

export async function updateTelegramPrefs(
  tenantId: string,
  userId: string,
  prefs: { reports?: boolean; reminders?: boolean; loginConfirm: boolean },
) {
  await db.user.updateMany({
    where: { id: userId, tenantId },
    data: {
      ...(prefs.reports !== undefined ? { telegramReports: prefs.reports } : {}),
      ...(prefs.reminders !== undefined ? { telegramReminders: prefs.reminders } : {}),
      telegramLoginConfirm: prefs.loginConfirm,
    },
  });
}

/** Chat qaysi xodimga tegishli (faol xodim va faol do'kon). */
export async function getStaffByChatId(chatId: string) {
  return db.user.findFirst({
    where: { telegramChatId: chatId, isActive: true, tenant: { isActive: true } },
    include: { tenant: { select: { id: true, name: true } } },
  });
}

/**
 * Mijoz telefonini ulash. ISTISNO: bu yerda qidiruv tenant bo'yicha emas, telefon bo'yicha —
 * odam faqat O'Z raqamini (Telegram tasdiqlagan kontakt) ulaydi va faqat o'z qarzini ko'radi.
 */
export async function linkCustomerByPhone(rawPhone: string, chatId: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return [];
  const customers = await db.customer.findMany({
    where: { phone, isActive: true, tenant: { isActive: true } },
    select: { id: true, tenant: { select: { name: true } } },
  });
  if (!customers.length) return [];
  await db.customer.updateMany({
    where: { id: { in: customers.map((c) => c.id) } },
    data: { telegramChatId: chatId },
  });
  return [...new Set(customers.map((c) => c.tenant.name))];
}

/** Mijozning barcha do'konlardagi qarzi (/qarz buyrug'i uchun). */
export async function customerDebtsByChatId(chatId: string, now: Date) {
  const customers = await db.customer.findMany({
    where: { telegramChatId: chatId, isActive: true },
    select: { id: true, tenantId: true, tenant: { select: { name: true } } },
  });
  const result: { shop: string; debt: number; nextDue: Date | null }[] = [];
  for (const c of customers) {
    const debt = (await getAccountBalances(c.tenantId, [c.id])).get(c.id)?.debt ?? 0;
    if (debt <= 0) continue;
    const open = (await getOpenDebts(c.tenantId, [c.id])).get(c.id) ?? [];
    const s = debtStatus(open, now);
    result.push({ shop: c.tenant.name, debt, nextDue: s.oldestOverdue ?? s.nextDue });
  }
  return result;
}
