/**
 * Mijozni kassada tasdiqlash: kassir QR ko'rsatadi → mijoz botni ochadi va O'Z raqamini yuboradi
 * (Telegram tasdiqlagan kontakt) → bot 4 xonali kod beradi → mijoz kassirga aytadi → kassir kiritadi.
 * Natija: Customer.telegramChatId va telegramVerifiedAt — raqam haqiqatan shu odamniki.
 */
import { randomBytes, randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { normalizePhone } from "@/lib/validation/auth";
import { ServiceError } from "../errors";
import { telegramConfig } from "./config";

export const VERIFY_TTL_MS = 10 * 60 * 1000;
export const VERIFY_MAX_ATTEMPTS = 5;

/** Kassir: yangi tasdiqlash (QR uchun havola). Eski kutilayotganlari bekor qilinadi. */
export async function startCustomerVerification(
  tenantId: string,
  customerId: string,
  now = new Date(),
) {
  const { username } = telegramConfig();
  if (!username) throw new ServiceError(uz.telegram.verifyBotMissing);
  const customer = await db.customer.findFirst({
    where: { id: customerId, tenantId, isActive: true },
    select: { phone: true },
  });
  if (!customer) throw new ServiceError(uz.customers.notFound);
  if (!customer.phone) throw new ServiceError(uz.telegram.verifyNeedPhone);

  await db.customerVerification.deleteMany({
    where: { tenantId, customerId, status: { not: "DONE" } },
  });
  const id = randomBytes(12).toString("base64url");
  await db.customerVerification.create({
    data: { id, tenantId, customerId, expiresAt: new Date(now.getTime() + VERIFY_TTL_MS) },
  });
  return { id, url: `https://t.me/${username}?start=v_${id}` };
}

/** Bot: mijoz QR orqali /start v_<id> bosdi. Qaytaradi: do'kon nomi yoki null (eskirgan). */
export async function openVerification(id: string, chatId: string, now = new Date()) {
  const v = await db.customerVerification.findUnique({
    where: { id },
    include: { tenant: { select: { name: true } } },
  });
  if (!v || v.expiresAt < now || v.status === "DONE") return null;
  await db.customerVerification.update({
    where: { id },
    data: { status: "STARTED", chatId },
  });
  return { shop: v.tenant.name };
}

/**
 * Bot: mijoz kontakt yubordi. Shu chat uchun ochilgan tasdiqlash bo'lsa — raqam solishtiriladi.
 * null — bu chat uchun tasdiqlash yo'q (kontakt oddiy ulanish sifatida qayta ishlanadi).
 */
export async function verificationContact(
  chatId: string,
  rawPhone: string,
  now = new Date(),
): Promise<{ code: string } | { mismatch: true } | null> {
  const v = await db.customerVerification.findFirst({
    where: { chatId, status: "STARTED", expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { phone: true } } },
  });
  if (!v) return null;
  if (normalizePhone(rawPhone) !== v.customer.phone) return { mismatch: true };
  const code = String(randomInt(0, 10_000)).padStart(4, "0");
  await db.customerVerification.update({
    where: { id: v.id },
    data: { status: "CODE_SENT", code },
  });
  return { code };
}

/** Kassir sahifasi uchun: oxirgi tasdiqlash holati. */
export async function verificationState(tenantId: string, customerId: string, now = new Date()) {
  const v = await db.customerVerification.findFirst({
    where: { tenantId, customerId },
    orderBy: { createdAt: "desc" },
    select: { status: true, expiresAt: true },
  });
  if (!v) return null;
  if (v.status !== "DONE" && v.expiresAt < now) return "EXPIRED" as const;
  return v.status;
}

/** Kassir mijoz aytgan kodni kiritdi. To'g'ri bo'lsa — mijoz Telegramga ulanadi va tasdiqlanadi. */
export async function confirmCustomerCode(
  tenantId: string,
  customerId: string,
  rawCode: string,
  now = new Date(),
) {
  const v = await db.customerVerification.findFirst({
    where: { tenantId, customerId, status: "CODE_SENT" },
    orderBy: { createdAt: "desc" },
  });
  if (!v || v.expiresAt < now) throw new ServiceError(uz.telegram.verifyExpired, "code");
  if (v.attempts >= VERIFY_MAX_ATTEMPTS) throw new ServiceError(uz.telegram.verifyTooMany, "code");
  if (rawCode.trim() !== v.code) {
    await db.customerVerification.update({
      where: { id: v.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ServiceError(uz.telegram.verifyWrongCode, "code");
  }
  await db.$transaction([
    db.customer.updateMany({
      where: { id: customerId, tenantId },
      data: { telegramChatId: v.chatId, telegramVerifiedAt: now },
    }),
    db.customerVerification.update({ where: { id: v.id }, data: { status: "DONE" } }),
  ]);
}
