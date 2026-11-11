/**
 * Telegram Mini App autentifikatsiyasi.
 * initData imzosi bot tokeni bilan HMAC-SHA256 orqali tekshiriladi (Telegram rasmiy algoritmi):
 *   secret = HMAC_SHA256(key="WebAppData", data=botToken)
 *   hash   = HMAC_SHA256(key=secret, data=dataCheckString)
 * Sessiya tokenlari bazada FAQAT hash ko'rinishida saqlanadi va muddati tugaydi.
 */
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { telegramConfig } from "./config";
import { ServiceError } from "../errors";

const SESSION_DAYS = 7;
const MAX_INIT_AGE_SEC = 24 * 60 * 60;

export type MiniAppUser = { id: number; first_name?: string; last_name?: string; username?: string };

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

/** initData'ni ajratib, imzosini tekshiradi. Yaroqsiz bo'lsa — ServiceError. */
export function validateInitData(raw: string, now: Date = new Date()): MiniAppUser {
  const botToken = telegramConfig().token;
  if (!botToken) throw new ServiceError(uz.miniapp.botNotConfigured);

  const params = new URLSearchParams(raw);
  const hash = params.get("hash");
  // Faqat "hash" chiqariladi. "signature" (yangi Telegram maydoni) imzoga KIRADI — uni olib tashlasak tekshiruv buziladi.
  params.delete("hash");
  if (!hash) throw new ServiceError(uz.miniapp.invalidInitData);

  // Rasmiy talab: kalitlar nomi bo'yicha tartiblanadi (kalit=qiymat, qatorlar "\n" bilan)
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = hmac("WebAppData", botToken);
  const computed = hmac(secret, dataCheckString).toString("hex");
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== computed.length / 2 || !crypto.timingSafeEqual(expected, Buffer.from(computed, "hex"))) {
    throw new ServiceError(uz.miniapp.invalidInitData);
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Math.floor(now.getTime() / 1000) - authDate > MAX_INIT_AGE_SEC) {
    throw new ServiceError(uz.miniapp.expiredInitData);
  }

  let user: MiniAppUser;
  try {
    user = JSON.parse(params.get("user") ?? "");
  } catch {
    throw new ServiceError(uz.miniapp.invalidInitData);
  }
  if (!user?.id) throw new ServiceError(uz.miniapp.invalidInitData);
  return user;
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

/** Yangi Mini App sessiyasi: token 1 marta qaytariladi, bazada faqat hash. */
export async function createMiniAppSession(userId: string, tenantId: string, deviceId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.miniAppToken.create({ data: { userId, tenantId, deviceId, tokenHash: tokenHash(token), expiresAt } });
  return { token, expiresAt };
}

export type MiniAppContext = {
  userId: string;
  tenantId: string;
  deviceId: string;
  role: string;
  name: string;
};

/**
 * Token bo'yicha sessiya: muddati, xodim faolligi, do'kon faolligi va qurilma
 * bekor qilinmaganligi tekshiriladi. Egasi qurilmani o'chirsa — darhol ishlamaydi.
 */
export async function resolveMiniAppToken(token: string): Promise<MiniAppContext> {
  const clean = String(token).trim();
  if (clean.length < 32 || clean.length > 128) throw new ServiceError(uz.miniapp.sessionExpired);
  const row = await db.miniAppToken.findUnique({
    where: { tokenHash: tokenHash(clean) },
    include: {
      user: { select: { id: true, name: true, role: true, isActive: true } },
      tenant: { select: { isActive: true } },
    },
  });
  if (!row || row.expiresAt < new Date()) throw new ServiceError(uz.miniapp.sessionExpired);
  if (!row.user.isActive || !row.tenant.isActive) throw new ServiceError(uz.miniapp.sessionExpired);
  const device = await db.staffDevice.findUnique({
    where: { userId_deviceId: { userId: row.userId, deviceId: row.deviceId } },
  });
  if (!device || device.revokedAt) throw new ServiceError(uz.miniapp.deviceRevoked);
  await db.staffDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });
  return { userId: row.userId, tenantId: row.tenantId, deviceId: row.deviceId, role: row.user.role, name: row.user.name };
}
