import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { adminLoginSchema, normalizePhone, pinLoginSchema } from "@/lib/validation/auth";
import type { Role } from "./permissions";
import { pinKey } from "./pin";
import { createLimiter, loginLimiter } from "./rate-limit";
import { consumeChallenge, loginConfirmRequired } from "./telegram/login-confirm";

/**
 * Ikki xil kirish, bitta ekranda:
 *  - kassir: 4 xonali PIN (faqat CASHIER);
 *  - admin: login (masalan "admin") yoki telefon + parol (egasi, menejer, omborchi, platforma admini).
 */

/** PIN: bitta IP'dan 15 daqiqada 10 ta xato — 4 xonali kodni terib topishdan himoya. */
export const pinLimiter = createLimiter(10);

/** Admin: login/telefon bo'yicha vaqtincha bloklanganmi (forma xabari uchun). */
export function loginBlockedMinutes(identifier: string): number | null {
  const state = loginLimiter.check(identifier.trim().toLowerCase());
  return state.blocked ? state.minutes : null;
}

/** Mijoz IP'si: proksi (Railway) qo'shgan oxirgi qiymat — mijoz uni soxtalashtira olmaydi. */
export function ipFromHeaders(headers: Headers | undefined): string {
  const xff = headers?.get("x-forwarded-for");
  if (xff) return xff.split(",").pop()!.trim();
  return headers?.get("x-real-ip") ?? "unknown";
}

export function pinBlockedMinutes(ip: string): number | null {
  const state = pinLimiter.check(ip);
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
  login?: string | null;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  tenantId: string;
  tenant: { name: string; isActive: boolean };
  telegramChatId?: string | null;
  telegramLoginConfirm?: boolean;
};

export type AuthDeps = {
  /** Admin kirishi: login yoki telefon bo'yicha (kassir emas) */
  findAdmin: (identifier: string) => Promise<UserRecord | null>;
  /** Kassir kirishi: PIN kaliti bo'yicha */
  findCashierByPinKey: (key: string) => Promise<UserRecord | null>;
  /** Telegramda tasdiqlangan kirish so'rovini bir marta ishlatish */
  consumeChallenge?: (id: string, userId: string) => Promise<boolean>;
};

// ISTISNO: login paytida tenant hali noma'lum, shuning uchun foydalanuvchi butun bazadan qidiriladi
// (login va telefon yagona). Boshqa barcha so'rovlar tenantId bilan filtrlanadi.
const userInclude = { tenant: { select: { name: true, isActive: true } } } as const;

const defaultDeps: AuthDeps = {
  findAdmin: (identifier) => {
    const phone = normalizePhone(identifier);
    return db.user.findFirst({
      where: {
        role: { not: "CASHIER" },
        OR: [{ login: identifier }, ...(phone ? [{ phone }] : [])],
      },
      include: userInclude,
    });
  },
  findCashierByPinKey: (key) =>
    db.user.findFirst({ where: { pinKey: key, role: "CASHIER" }, include: userInclude }),
  consumeChallenge: (id, userId) => consumeChallenge(id, userId),
};

export type VerifiedUser = SessionUser & {
  telegramChatId: string | null;
  telegramLoginConfirm: boolean;
};

function toVerified(user: UserRecord): VerifiedUser {
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

/** Admin: login/telefon + parol (Telegram tasdiqisiz). */
export async function verifyAdmin(input: unknown, deps: AuthDeps = defaultDeps): Promise<VerifiedUser | null> {
  const parsed = adminLoginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { identifier, password } = parsed.data;
  const key = identifier.toLowerCase();

  // Parolni terib topishdan himoya: bir login/telefonda 15 daqiqada 5 ta xato urinish
  if (loginLimiter.check(key).blocked) return null;

  const user = await deps.findAdmin(identifier);
  const ok =
    !!user &&
    user.isActive &&
    user.tenant.isActive &&
    (await bcrypt.compare(password, user.passwordHash));
  if (!ok || !user) {
    loginLimiter.fail(key);
    return null;
  }
  loginLimiter.reset(key);
  return toVerified(user);
}

/** Kassir: PIN (Telegram tasdiqisiz). IP bo'yicha cheklanadi. */
export async function verifyPin(
  input: unknown,
  ip: string,
  deps: AuthDeps = defaultDeps,
): Promise<VerifiedUser | null> {
  const parsed = pinLoginSchema.safeParse(input);
  if (!parsed.success) return null;
  if (pinLimiter.check(ip).blocked) return null;

  const user = await deps.findCashierByPinKey(pinKey(parsed.data.pin));
  if (!user || !user.isActive || !user.tenant.isActive) {
    pinLimiter.fail(ip);
    return null;
  }
  pinLimiter.reset(ip);
  return toVerified(user);
}

/**
 * Sessiya ochish uchun (Auth.js authorize). `mode`: "pin" yoki "admin".
 * Kerak bo'lsa Telegramda tasdiqlangan so'rov (`challengeId`) ham tekshiriladi.
 * Muvaffaqiyatsiz bo'lsa sababini oshkor qilmasdan null qaytaradi.
 */
export async function authenticateUser(
  input: unknown,
  ip = "unknown",
  deps: AuthDeps = defaultDeps,
): Promise<SessionUser | null> {
  const mode = (input as { mode?: unknown } | null)?.mode;
  const user =
    mode === "pin"
      ? await verifyPin(input, ip, deps)
      : mode === "admin"
        ? await verifyAdmin(input, deps)
        : null;
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

/**
 * Admin o'z parolini o'zgartiradi. Eski parol to'g'ri bo'lishi shart. Yangi parol berilgandan
 * keyin barcha sessiyalar (shu jumladan joriy) yopiladi — qayta kirish talab qilinadi.
 */
export async function changeOwnPassword(
  userId: string,
  current: string,
  next: string,
): Promise<"ok" | "wrong_current"> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return "wrong_current";
  if (!(await bcrypt.compare(current, user.passwordHash))) return "wrong_current";
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next), sessionsValidFrom: new Date() },
  });
  return "ok";
}
