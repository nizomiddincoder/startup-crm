/**
 * Platforma admini (SUPER_ADMIN) uchun: do'konlar (tenant) boshqaruvi.
 * ISTISNO: bu funksiyalar ataylab barcha do'konlar bo'yicha ishlaydi — faqat /admin bo'limidan
 * (SUPER_ADMIN) chaqiriladi. Do'kon ichidagi ma'lumotlar (sotuv, mijoz) bu yerda o'qilmaydi,
 * faqat umumiy sonlar.
 */
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { normalizePhone } from "@/lib/validation/auth";
import { shopSchema, type ShopInput } from "@/lib/validation/staff";
import { hashPassword } from "./auth";
import { isUniqueViolation, ServiceError } from "./errors";
import { generatePassword } from "./passwords";
import { tashkentDayRange } from "./sales";

export const PLATFORM_TENANT_ID = "platform";

export async function listTenants(now = new Date()) {
  const { from } = tashkentDayRange(now);
  const tenants = await db.tenant.findMany({
    where: { id: { not: PLATFORM_TENANT_ID } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, products: true } },
      users: { where: { role: "OWNER" }, select: { name: true, phone: true }, take: 1 },
    },
  });
  const salesToday = await db.sale.groupBy({
    by: ["tenantId"],
    where: { createdAt: { gte: from } },
    _count: true,
  });
  const lastSales = await db.sale.groupBy({ by: ["tenantId"], _max: { createdAt: true } });
  const today = new Map(salesToday.map((s) => [s.tenantId, s._count]));
  const last = new Map(lastSales.map((s) => [s.tenantId, s._max.createdAt]));
  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    isActive: t.isActive,
    trialEndsAt: t.trialEndsAt,
    createdAt: t.createdAt,
    owner: t.users[0] ?? null,
    users: t._count.users,
    products: t._count.products,
    salesToday: today.get(t.id) ?? 0,
    lastSaleAt: last.get(t.id) ?? null,
  }));
}

/** Yangi do'kon + egasi bitta tranzaksiyada. Egasi paroli bir marta qaytariladi. */
export async function createTenantWithOwner(input: ShopInput) {
  const data = shopSchema.parse(input);
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  try {
    return await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: data.shopName, address: data.address, phone: data.shopPhone },
      });
      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.ownerName,
          phone: data.ownerPhone,
          role: "OWNER",
          passwordHash,
        },
        select: { name: true, phone: true },
      });
      return { tenantId: tenant.id, owner, password };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(uz.staff.phoneTaken, "ownerPhone");
    throw error;
  }
}

/** Do'konni o'chirish/yoqish (masalan, to'lov qilinmasa). O'chirilgan do'kon xodimlari kira olmaydi. */
export async function setTenantActive(tenantId: string, isActive: boolean) {
  if (tenantId === PLATFORM_TENANT_ID) throw new ServiceError(uz.admin.cannotDisablePlatform);
  await db.tenant.update({ where: { id: tenantId }, data: { isActive } });
}

/**
 * Serverni birinchi ishga tushirishda platforma adminini yaratadi (start-prod.mjs).
 * Admin bor bo'lsa — hech narsani o'zgartirmaydi.
 */
export async function bootstrapPlatformAdmin(input: {
  login: string;
  password: string;
  name: string;
  /** Ixtiyoriy: berilmasa — admin faqat login bilan kiradi */
  phone?: string;
}): Promise<"created" | "exists" | "invalid"> {
  const login = input.login.trim();
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(login) || input.password.length < 8) return "invalid";
  const phone = input.phone ? normalizePhone(input.phone) : null;
  if (input.phone && !phone) return "invalid";

  const existing = await db.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) return "exists";

  await db.tenant.upsert({
    where: { id: PLATFORM_TENANT_ID },
    update: {},
    create: { id: PLATFORM_TENANT_ID, name: "Platforma" },
  });
  await db.user.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      name: input.name,
      // Telefon bazada majburiy (yagona). Login bilan kiradigan admin uchun joy-belgi.
      phone: phone ?? PLATFORM_ADMIN_PLACEHOLDER_PHONE,
      login,
      role: "SUPER_ADMIN",
      passwordHash: await hashPassword(input.password),
    },
  });
  return "created";
}

export const PLATFORM_ADMIN_PLACEHOLDER_PHONE = "+998000000000";
