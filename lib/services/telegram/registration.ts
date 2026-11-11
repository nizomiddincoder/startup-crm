/**
 * Botda mijoz ro'yxatdan o'tishi: /start → ism familiya → telefon (Telegram kontakti) → mijoz yaratiladi.
 * Odam doim MIJOZ bo'ladi — bot orqali xodim sifatida ulanmaydi.
 * Do'kon aniqlash: havola `t.me/<bot>?start=s_<do'kon ID>`; havolasiz bo'lsa — yagona faol do'kon.
 */
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/validation/auth";
import { PLATFORM_TENANT_ID } from "@/lib/demo";
import { isUniqueViolation } from "../errors";
import { linkCustomerByPhone } from "./linking";

export const REGISTRATION_TTL_MS = 30 * 60 * 1000;

/** Ism familiya: kamida 2 so'z, harf, bo'shliq, tire va apostrof. */
const NAME_RE = /^\p{L}[\p{L}'’\- ]{0,78}\p{L}$/u;

export function parseFullName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 5 || name.length > 80) return null;
  if (!NAME_RE.test(name)) return null;
  if (name.split(" ").length < 2) return null;
  return name;
}

/** `/start` parametri: "s_<do'kon ID>" bo'lsa — shu do'kon ID'si, aks holda null. */
export function parseShopParam(param: string): string | null {
  const m = /^s_([a-z0-9]{10,40})$/i.exec(param.trim());
  return m ? m[1] : null;
}

export type RegistrationStep = { step: "name" } | { step: "phone"; name: string };
type Pending = RegistrationStep & { tenantId: string; expiresAt: number };

// Ro'yxatdan o'tish jarayoni (bot jarayonida, xotirada). Qayta ishga tushsa — /start qayta bosiladi.
const pending = new Map<string, Pending>();

export function startRegistration(chatId: string, tenantId: string, now = Date.now()) {
  pending.set(chatId, { step: "name", tenantId, expiresAt: now + REGISTRATION_TTL_MS });
}

export function getRegistration(chatId: string, now = Date.now()): (Pending & RegistrationStep) | null {
  const p = pending.get(chatId);
  if (!p) return null;
  if (p.expiresAt < now) {
    pending.delete(chatId);
    return null;
  }
  return p;
}

export function setRegistrationName(chatId: string, name: string, now = Date.now()) {
  const p = getRegistration(chatId, now);
  if (!p) return;
  pending.set(chatId, { step: "phone", name, tenantId: p.tenantId, expiresAt: now + REGISTRATION_TTL_MS });
}

export function clearRegistration(chatId: string) {
  pending.delete(chatId);
}

/** Do'kon: `s_` havolasi bo'yicha, yo'q bo'lsa — yagona faol do'kon (pilot). Topilmasa — null. */
export async function resolveShop(param: string): Promise<{ id: string; name: string } | null> {
  const id = parseShopParam(param);
  if (id) {
    return db.tenant.findFirst({
      where: { id, isActive: true },
      select: { id: true, name: true },
    });
  }
  const shops = await db.tenant.findMany({
    where: { isActive: true, id: { not: PLATFORM_TENANT_ID } },
    select: { id: true, name: true },
    take: 2,
  });
  return shops.length === 1 ? shops[0] : null;
}

/**
 * Telefon raqami tasdiqlangan mijozni yaratadi yoki mavjudini chat'ga bog'laydi.
 * Do'kondagi mavjud mijoz ismi o'zgarmaydi (kassada yozilgan ism ustun turadi).
 * Boshqa do'konlardagi shu raqamli mijozlar ham chat'ga ulanadi (/buyurtmalarim uchun).
 */
export async function registerCustomerByChat(input: {
  tenantId: string;
  name: string;
  phone: string;
  chatId: string;
}): Promise<{ shop: string; name: string; created: boolean } | null> {
  const phone = normalizePhone(input.phone);
  if (!phone) return null;

  const shop = await db.tenant.findUnique({ where: { id: input.tenantId }, select: { name: true } });
  if (!shop) return null;

  const existing = await db.customer.findUnique({
    where: { tenantId_phone: { tenantId: input.tenantId, phone } },
    select: { id: true, name: true },
  });
  let created = false;
  let name = existing?.name ?? input.name;
  if (existing) {
    await db.customer.update({
      where: { id: existing.id },
      data: { telegramChatId: input.chatId, isActive: true },
    });
  } else {
    try {
      await db.customer.create({
        data: { tenantId: input.tenantId, name: input.name, phone, telegramChatId: input.chatId },
      });
      created = true;
    } catch (error) {
      // Bir vaqtda ikki marta yuborilsa — ikkinchisi mavjudni bog'laydi
      if (!isUniqueViolation(error)) throw error;
      const again = await db.customer.findUnique({
        where: { tenantId_phone: { tenantId: input.tenantId, phone } },
        select: { id: true, name: true },
      });
      if (!again) throw error;
      name = again.name;
      await db.customer.update({ where: { id: again.id }, data: { telegramChatId: input.chatId } });
    }
  }
  await linkCustomerByPhone(phone, input.chatId);
  return { shop: shop.name, name, created };
}
