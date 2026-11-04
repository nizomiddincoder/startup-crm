import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";
import type { Role } from "./permissions";
import { loginLimiter } from "./rate-limit";
import { consumeChallenge, loginConfirmRequired } from "./telegram/login-confirm";

/** Telefon vaqtincha bloklanganmi (login formasida tushunarli xabar ko'rsatish uchun). */
export function loginBlockedMinutes(rawPhone: unknown): number | null {
  const parsed = loginSchema.shape.phone.safeParse(rawPhone);
  if (!parsed.success) return null;
  const state = loginLimiter.check(parsed.data);
  return state.blocked ? state.minutes : null;
}

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  tenantId: string;
  tenantName: string;
};

type UserRecord = {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  tenantId: string;
  tenant: { name: string; isActive: boolean };
  telegramChatId?: string | null;
  telegramLoginConfirm?: boolean;
};

export type AuthDeps = {
  findUserByPhone: (phone: string) => Promise<UserRecord | null>;
  /** Telegramda tasdiqlangan kirish so'rovini bir marta ishlatish */
  consumeChallenge?: (id: string, userId: string) => Promise<boolean>;
};

// ISTISNO: login paytida tenant hali noma'lum, shuning uchun foydalanuvchi telefon bo'yicha
// butun bazadan qidiriladi (phone — yagona). Boshqa barcha so'rovlar tenantId bilan filtrlanadi.
const defaultDeps: AuthDeps = {
  findUserByPhone: (phone) =>
    db.user.findUnique({
      where: { phone },
      include: { tenant: { select: { name: true, isActive: true } } },
    }),
  consumeChallenge: (id, userId) => consumeChallenge(id, userId),
};

export type VerifiedUser = SessionUser & {
  telegramChatId: string | null;
  telegramLoginConfirm: boolean;
};

/**
 * Faqat telefon va parol (Telegram tasdiqisiz). Login formasi birinchi qadamda shu bilan
 * tekshiradi; sessiya ochish — faqat authenticateUser orqali.
 */
export async function verifyPassword(
  input: unknown,
  deps: AuthDeps = defaultDeps,
): Promise<VerifiedUser | null> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { phone } = parsed.data;

  // Parolni terib topishdan himoya: telefon bo'yicha 15 daqiqada 5 ta xato urinish
  if (loginLimiter.check(phone).blocked) return null;

  const user = await deps.findUserByPhone(phone);
  const ok =
    !!user &&
    user.isActive &&
    user.tenant.isActive &&
    (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!ok || !user) {
    loginLimiter.fail(phone);
    return null;
  }
  loginLimiter.reset(phone);

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    telegramChatId: user.telegramChatId ?? null,
    telegramLoginConfirm: user.telegramLoginConfirm ?? false,
  };
}

/**
 * Sessiya ochish uchun (Auth.js authorize): parol + kerak bo'lsa Telegramda tasdiqlangan
 * so'rov (`challengeId`). Muvaffaqiyatsiz bo'lsa sababini oshkor qilmasdan null qaytaradi.
 */
export async function authenticateUser(
  input: unknown,
  deps: AuthDeps = defaultDeps,
): Promise<SessionUser | null> {
  const user = await verifyPassword(input, deps);
  if (!user) return null;
  if (loginConfirmRequired(user)) {
    const challengeId = (input as { challengeId?: unknown } | null)?.challengeId;
    if (typeof challengeId !== "string" || !challengeId) return null;
    if (!(await deps.consumeChallenge?.(challengeId, user.id))) return null;
  }
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
  };
}

/** Sessiya (JWT) amal qilish muddati — auth.config.ts'dagi maxAge bilan bir xil. */
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type SessionRef = { userId: string; tenantId: string; loginAt: number; sid: string };

/**
 * Sessiya hali ham yaroqlimi: xodim bloklanmagan, do'kon o'chirilmagan, shu sessiyada "Chiqish"
 * bosilmagan va u yangi parol berilgandan keyin ochilgan.
 */
export async function isSessionActive({
  userId,
  tenantId,
  loginAt,
  sid,
}: SessionRef): Promise<boolean> {
  const [user, revoked] = await Promise.all([
    db.user.findFirst({
      where: {
        id: userId,
        tenantId,
        isActive: true,
        tenant: { isActive: true },
        OR: [{ sessionsValidFrom: null }, { sessionsValidFrom: { lte: new Date(loginAt) } }],
      },
      select: { id: true },
    }),
    sid ? db.revokedSession.findUnique({ where: { sid }, select: { sid: true } }) : null,
  ]);
  return user !== null && revoked === null;
}

/**
 * "Chiqish": faqat SHU sessiya bekor qilinadi (boshqa qurilmalardagi kirish saqlanadi).
 * Muddati o'tgan yozuvlar shu yerda tozalanadi — jadval o'smaydi.
 */
export async function revokeSession(
  { userId, sid }: { userId: string; sid: string },
  now = new Date(),
): Promise<void> {
  if (!sid) return;
  await db.revokedSession.upsert({
    where: { sid },
    update: {},
    create: { sid, userId, expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS) },
  });
  await db.revokedSession.deleteMany({ where: { expiresAt: { lt: now } } });
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
