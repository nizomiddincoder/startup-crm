/**
 * Xodimlarni Telegram Mini App'ga taklif qilish.
 * Egasi xodimni qo'shadi (ism, telefon, rol, filial) → tizim taklif havolasi/QR yaratadi.
 * Xodim havolani Telegram'da ochadi: initData imzosi tekshirilib, telegram_user_id
 * xodim yozuviga bog'lanadi. Keyingi kirishlar avtomatik. Fallback: qurilmaga PIN.
 * Kassir eganing parolini hech qachon olmaydi — faqat Mini App orqali kiradi.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { t, uz } from "@/lib/i18n/uz";
import { planLimits } from "@/lib/plans";
import { telegramConfig } from "./telegram/config";
import { hashPassword } from "./auth";
import { normalizePhone } from "@/lib/validation/auth";
import { isUniqueViolation, ServiceError } from "./errors";
import { assertSubscriptionActive } from "./companies";

const INVITE_DAYS = 3;

export type InviteInput = {
  name: string;
  phone: string;
  role: "MANAGER" | "CASHIER" | "WAREHOUSE";
  branchId?: string;
};

const INVITABLE_ROLES = ["MANAGER", "CASHIER", "WAREHOUSE"];

export async function listInvites(tenantId: string) {
  return db.staffInvite.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, name: true, phone: true, role: true, status: true,
      token: true, expiresAt: true, acceptedAt: true, branchId: true,
    },
  });
}

/** Taklif havolasi: t.me/<bot>?startapp=inv_<token> — Telegram uni Mini App'ga uzatadi. */
export function inviteLink(token: string): string | null {
  const username = telegramConfig().username;
  return username ? `https://t.me/${username}?startapp=inv_${token}` : null;
}

export async function createStaffInvite(tenantId: string, actorId: string, input: InviteInput) {
  await assertSubscriptionActive(tenantId);
  if (!INVITABLE_ROLES.includes(input.role)) {
    throw new ServiceError(uz.validation.invalidChoice, "role");
  }
  const phone = normalizePhone(input.phone);
  if (!phone) throw new ServiceError(uz.validation.invalidPhone, "phone");
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new ServiceError(uz.validation.tooLong, "name");

  if (input.branchId) {
    const branch = await db.branch.findFirst({ where: { id: input.branchId, tenantId, isActive: true } });
    if (!branch) throw new ServiceError(uz.branches.notFound, "branchId");
  }

  // Limit: xodimlar soni (tarif + qo'shimchalar). Mavjud foydalanuvchi boshqa
  // kompaniyadan taklif qilinsa — yangi limit birlikka oshirmaydi.
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, addonCashiers: true, addonBranches: true },
  });
  if (!tenant) throw new ServiceError(uz.companies.notFound);
  const limits = planLimits(tenant);
  const staffCount = await db.user.count({ where: { tenantId, isActive: true } });
  const existing = await db.user.findUnique({ where: { phone }, select: { id: true } });
  if (!existing && staffCount >= limits.cashiers) {
    throw new ServiceError(t(uz.subscription.limitCashiers, { limit: limits.cashiers }), "phone");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const invite = await db.staffInvite.create({
    data: {
      tenantId,
      name,
      phone,
      role: input.role,
      branchId: input.branchId || null,
      token,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      createdById: actorId,
    },
  });
  return { invite, link: inviteLink(token) };
}

/**
 * Taklifni qabul qilish (Mini App initData tasdiqlangandan keyin):
 * telefon bo'yicha foydalanuvchi topiladi yoki yaratiladi, Membership va qurilma bog'lanadi.
 */
export async function acceptInvite(input: {
  token: string;
  telegramUserId: number;
  deviceId: string;
  displayName?: string;
}) {
  const invite = await db.staffInvite.findUnique({ where: { token: input.token } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw new ServiceError(uz.invites.notFound);
  }

  const user = await db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { phone: invite.phone } });
    if (!user) {
      // Kassirga parol bermaymiz: tasodifiy (hech qachon ko'rsatilmaydi) — kirish Mini App orqali
      user = await tx.user.create({
        data: {
          tenantId: invite.tenantId,
          name: invite.name,
          phone: invite.phone,
          role: invite.role,
          branchId: invite.branchId,
          telegramChatId: String(input.telegramUserId),
          passwordHash: await hashPassword(crypto.randomBytes(24).toString("hex")),
        },
      });
    } else {
      if (!user.isActive) throw new ServiceError(uz.invites.notFound);
      if (!user.telegramChatId) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { telegramChatId: String(input.telegramUserId) },
        });
      }
      await tx.membership.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: invite.tenantId } },
        create: { userId: user.id, tenantId: invite.tenantId, role: invite.role, branchId: invite.branchId },
        update: { role: invite.role, branchId: invite.branchId },
      });
    }
    if (user.tenantId === invite.tenantId) {
      await tx.user.update({
        where: { id: user.id },
        data: { role: invite.role, branchId: invite.branchId },
      });
    }
    await tx.staffDevice.upsert({
      where: { userId_deviceId: { userId: user.id, deviceId: input.deviceId } },
      create: {
        userId: user.id,
        tenantId: invite.tenantId,
        deviceId: input.deviceId,
        telegramUserId: String(input.telegramUserId),
        name: input.displayName ?? null,
      },
      update: { telegramUserId: String(input.telegramUserId), revokedAt: null, tenantId: invite.tenantId },
    });
    await tx.staffInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return user;
  });

  return { userId: user.id, tenantId: invite.tenantId, role: invite.role, branchId: invite.branchId };
}

export async function revokeInvite(tenantId: string, inviteId: string) {
  const invite = await db.staffInvite.findFirst({ where: { id: inviteId, tenantId } });
  if (!invite) throw new ServiceError(uz.invites.notFound);
  await db.staffInvite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
}

export async function listStaffDevices(tenantId: string) {
  return db.staffDevice.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, phone: true } } },
  });
}

/** Egasi xodim qurilmasini darhol o'chiradi: sessiya tokenlari ham o'chadi. */
export async function revokeDevice(tenantId: string, deviceId: string) {
  const device = await db.staffDevice.findFirst({ where: { id: deviceId, tenantId } });
  if (!device) throw new ServiceError(uz.invites.deviceNotFound);
  await db.$transaction([
    db.staffDevice.update({ where: { id: device.id }, data: { revokedAt: new Date() } }),
    db.miniAppToken.deleteMany({ where: { userId: device.userId, deviceId: device.deviceId } }),
  ]);
}

const PIN_RE = /^\d{4,6}$/;

/** Xodim o'z qurilmasiga PIN qo'yadi (Mini App'da, sessiya bilan). */
export async function setDevicePin(userId: string, deviceId: string, pin: string) {
  if (!PIN_RE.test(pin)) throw new ServiceError(uz.invites.pinInvalid, "pin");
  const device = await db.staffDevice.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
  });
  if (!device || device.revokedAt) throw new ServiceError(uz.invites.deviceNotFound);
  await db.staffDevice.update({
    where: { id: device.id },
    data: { pinHash: await bcrypt.hash(pin, 10) },
  });
}

/** Fallback kirish: telefon + PIN. Faqat avval bog'langan (bekor qilinmagan) qurilmada. */
export async function authWithPin(phone: string, pin: string, deviceId: string) {
  const clean = normalizePhone(phone);
  if (!clean || !PIN_RE.test(pin)) throw new ServiceError(uz.miniapp.invalidCredentials);
  const user = await db.user.findUnique({ where: { phone: clean } });
  if (!user || !user.isActive) throw new ServiceError(uz.miniapp.invalidCredentials);
  const device = await db.staffDevice.findUnique({
    where: { userId_deviceId: { userId: user.id, deviceId } },
  });
  if (!device || device.revokedAt || !device.pinHash) throw new ServiceError(uz.miniapp.invalidCredentials);
  if (!(await bcrypt.compare(pin, device.pinHash))) throw new ServiceError(uz.miniapp.invalidCredentials);
  return { userId: user.id, tenantId: device.tenantId, deviceId };
}
