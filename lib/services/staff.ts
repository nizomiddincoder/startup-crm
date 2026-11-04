/** Do'kon xodimlari (egasi boshqaradi). Har so'rov tenantId bo'yicha. */
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { staffSchema, type StaffInput } from "@/lib/validation/staff";
import { hashPassword } from "./auth";
import { isUniqueViolation, ServiceError } from "./errors";
import { generatePassword } from "./passwords";

export async function listStaff(tenantId: string) {
  return db.user.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, phone: true, role: true, isActive: true, telegramChatId: true },
  });
}

/** Yangi xodim. Parol avtomatik yaratiladi va FAQAT bir marta qaytariladi (bazada — hash). */
export async function createStaff(tenantId: string, input: StaffInput) {
  const data = staffSchema.parse(input);
  const password = generatePassword();
  try {
    const user = await db.user.create({
      data: { tenantId, ...data, passwordHash: await hashPassword(password) },
      select: { id: true, name: true, phone: true },
    });
    return { user, password };
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(uz.staff.phoneTaken, "phone");
    throw error;
  }
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
  await editableStaff(tenantId, actorId, userId);
  const password = generatePassword();
  await db.user.updateMany({
    where: { id: userId, tenantId },
    // Eski parol bilan ochilgan sessiyalar ham yopiladi
    data: { passwordHash: await hashPassword(password), sessionsValidFrom: new Date() },
  });
  return password;
}
