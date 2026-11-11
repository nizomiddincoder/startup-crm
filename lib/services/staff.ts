/** Do'kon xodimlari (egasi boshqaradi). Har so'rov tenantId bo'yicha. */
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { staffSchema, type StaffInput } from "@/lib/validation/staff";
import { hashPassword } from "./auth";
import { isUniqueViolation, ServiceError } from "./errors";
import { uniquePin } from "./pin";
import { generatePassword } from "./passwords";

export async function listStaff(tenantId: string) {
  return db.user.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, phone: true, role: true, isActive: true, telegramChatId: true },
  });
}

/** PIN butun tizimda yagona (kassir PIN bilan kiradi, do'konni PIN o'zi aniqlaydi). */
async function isPinTaken(key: string) {
  return (await db.user.count({ where: { pinKey: key } })) > 0;
}

/**
 * Yangi xodim. Kassir — avtomatik noyob PIN (FAQAT bir marta qaytariladi, bazada — kalit).
 * Boshqa rollar — avtomatik parol (FAQAT bir marta qaytariladi, bazada — hash).
 */
export async function createStaff(tenantId: string, input: StaffInput) {
  const data = staffSchema.parse(input);
  const isCashier = data.role === "CASHIER";
  const password = generatePassword();
  const pin = isCashier ? await uniquePin(isPinTaken) : null;
  try {
    const user = await db.user.create({
      data: {
        tenantId,
        ...data,
        passwordHash: await hashPassword(password),
        pinKey: pin?.key ?? null,
      },
      select: { id: true, name: true, phone: true },
    });
    return isCashier ? { user, pin: pin!.pin } : { user, password };
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(uz.staff.phoneTaken, "phone");
    throw error;
  }
}

/** Kassir PIN'ini yangilash (eskisi ishlamaydi). Faqat kassir uchun. */
export async function resetStaffPin(tenantId: string, actorId: string, userId: string) {
  const user = await editableStaff(tenantId, actorId, userId);
  if (user.role !== "CASHIER") throw new ServiceError(uz.staff.notCashier);
  const pin = await uniquePin(isPinTaken);
  await db.user.updateMany({ where: { id: userId, tenantId }, data: { pinKey: pin.key } });
  return pin.pin;
}

/** Egasi o'zini o'zi bloklay olmaydi va egalarni boshqa joydan o'zgartirib bo'lmaydi. */
async function editableStaff(tenantId: string, actorId: string, userId: string) {
  if (userId === actorId) throw new ServiceError(uz.staff.cannotEditSelf);
  const user = await db.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new ServiceError(uz.staff.notFound);
  if (user.role === "OWNER" || user.role === "SUPER_ADMIN") {
    throw new ServiceError(uz.staff.cannotEditOwner);
  }
  return user;
}

export async function setStaffActive(
  tenantId: string,
  actorId: string,
  userId: string,
  isActive: boolean,
) {
  await editableStaff(tenantId, actorId, userId);
  await db.user.updateMany({
    where: { id: userId, tenantId },
    // Bloklanganda Telegram ham uziladi
    data: isActive ? { isActive } : { isActive, telegramChatId: null },
  });
}

export async function resetStaffPassword(tenantId: string, actorId: string, userId: string) {
  const user = await editableStaff(tenantId, actorId, userId);
  if (user.role === "CASHIER") throw new ServiceError(uz.staff.usePin);
  const password = generatePassword();
  await db.user.updateMany({
    where: { id: userId, tenantId },
    // Eski parol bilan ochilgan sessiyalar ham yopiladi
    data: { passwordHash: await hashPassword(password), sessionsValidFrom: new Date() },
  });
  return password;
}
