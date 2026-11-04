/**
 * Kirishni Telegram orqali tasdiqlash. Parol to'g'ri bo'lgach botga "✅ / ❌" so'rovi boradi;
 * foydalanuvchi tasdiqlamaguncha sessiya ochilmaydi (tekshiruv authenticateUser ichida —
 * /api/auth orqali ham aylanib o'tib bo'lmaydi).
 * ISTISNO: login paytida tenant hali sessiyada yo'q — so'rov userId orqali bog'lanadi.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { telegramConfig } from "./config";

export const CHALLENGE_TTL_MS = 3 * 60 * 1000;

export type ChallengeState = "PENDING" | "APPROVED" | "DENIED" | "CONSUMED" | "EXPIRED";

/** Bot sozlangan, foydalanuvchi Telegramga ulangan va tasdiqlashni o'chirmagan bo'lsa. */
export function loginConfirmRequired(user: {
  telegramChatId: string | null;
  telegramLoginConfirm: boolean;
}): boolean {
  return !!telegramConfig().token && !!user.telegramChatId && user.telegramLoginConfirm;
}

export async function createLoginChallenge(userId: string, now = new Date()) {
  const id = randomBytes(18).toString("base64url");
  // Eski kutilayotgan so'rovlar bekor — bir vaqtda bitta
  await db.loginChallenge.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "DENIED" },
  });
  await db.loginChallenge.create({
    data: { id, userId, expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS) },
  });
  return id;
}

export async function getChallengeState(id: string, now = new Date()): Promise<ChallengeState> {
  const c = await db.loginChallenge.findUnique({
    where: { id },
    select: { status: true, expiresAt: true },
  });
  if (!c) return "EXPIRED";
  if ((c.status === "PENDING" || c.status === "APPROVED") && c.expiresAt < now) return "EXPIRED";
  return c.status;
}

/**
 * Botdagi tugma: faqat shu foydalanuvchining o'z chat'idan, muddati o'tmagan va hali javob
 * berilmagan so'rovga. Qaytaradi: yangi holat yoki null (boshqa chat / eskirgan).
 */
export async function answerChallenge(
  id: string,
  chatId: string,
  approve: boolean,
  now = new Date(),
): Promise<"APPROVED" | "DENIED" | null> {
  const status = approve ? "APPROVED" : "DENIED";
  const { count } = await db.loginChallenge.updateMany({
    where: {
      id,
      status: "PENDING",
      expiresAt: { gt: now },
      user: { telegramChatId: chatId, isActive: true },
    },
    data: { status },
  });
  return count === 1 ? status : null;
}

/** Tasdiqlangan so'rovni bir marta ishlatadi (kirish paytida). */
export async function consumeChallenge(id: string, userId: string, now = new Date()) {
  const { count } = await db.loginChallenge.updateMany({
    where: { id, userId, status: "APPROVED", expiresAt: { gt: now } },
    data: { status: "CONSUMED" },
  });
  return count === 1;
}
