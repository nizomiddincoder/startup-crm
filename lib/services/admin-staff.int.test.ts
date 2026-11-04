/**
 * Do'kon yaratish (admin) va xodimlar boshqaruvi — integratsiya testlari. Avval: npm run db:local
 */
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { bootstrapPlatformAdmin, createTenantWithOwner, setTenantActive } from "./admin";
import { authenticateUser, isSessionActive, revokeSession } from "./auth";
import { createStaff, resetStaffPassword, setStaffActive } from "./staff";

const createdTenants: string[] = [];

/** Sessiya (JWT) ichidagi ma'lumotlar: har kirish o'z sid'iga ega. */
const sess = (
  userId: string,
  tenantId: string,
  loginAt = Date.now(),
  sid = crypto.randomUUID(),
) => ({
  userId,
  tenantId,
  loginAt,
  sid,
});
const phone = () => `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

async function newShop() {
  const ownerPhone = phone();
  const res = await createTenantWithOwner({
    shopName: "Test do'kon",
    ownerName: "Egasi",
    ownerPhone,
  });
  createdTenants.push(res.tenantId);
  const owner = await db.user.findUniqueOrThrow({ where: { phone: `+998${ownerPhone}` } });
  return { ...res, owner };
}

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: createdTenants } } });
  await db.$disconnect();
});

describe("admin: do'kon yaratish", () => {
  it("egasi bir martalik parol bilan kira oladi; do'kon o'chirilsa — kira olmaydi", async () => {
    const shop = await newShop();
    expect(shop.password).toMatch(/^[a-z2-9]{8}$/);
    const user = await authenticateUser({ phone: shop.owner.phone, password: shop.password });
    expect(user).toMatchObject({ role: "OWNER", tenantId: shop.tenantId });

    // Kirib turgan egasi ham darhol chiqariladi (sessiya har safar tekshiriladi)
    expect(await isSessionActive(sess(shop.owner.id, shop.tenantId, Date.now()))).toBe(true);
    await setTenantActive(shop.tenantId, false);
    expect(await authenticateUser({ phone: shop.owner.phone, password: shop.password })).toBeNull();
    expect(await isSessionActive(sess(shop.owner.id, shop.tenantId, Date.now()))).toBe(false);
    await setTenantActive(shop.tenantId, true);
    expect(await isSessionActive(sess(shop.owner.id, shop.tenantId, Date.now()))).toBe(true);
  });

  it("chiqish faqat shu sessiyani yopadi; boshqa qurilmadagi kirish saqlanadi", async () => {
    const shop = await newShop();
    const phoneSession = sess(shop.owner.id, shop.tenantId);
    const pcSession = sess(shop.owner.id, shop.tenantId);
    expect(await isSessionActive(phoneSession)).toBe(true);

    await revokeSession({ userId: shop.owner.id, sid: phoneSession.sid });
    // Fondagi so'rov eski cookie'ni qayta yozsa ham — u yaroqsiz
    expect(await isSessionActive(phoneSession)).toBe(false);
    expect(await isSessionActive(pcSession)).toBe(true);
    // Takror "Chiqish" xato bermaydi
    await revokeSession({ userId: shop.owner.id, sid: phoneSession.sid });
  });

  it("band telefon bilan egasi yaratilmaydi", async () => {
    const shop = await newShop();
    await expect(
      createTenantWithOwner({
        shopName: "Ikkinchi",
        ownerName: "X",
        ownerPhone: shop.owner.phone,
      }),
    ).rejects.toMatchObject({ field: "ownerPhone", message: uz.staff.phoneTaken });
  });

  it("platforma admini allaqachon bo'lsa, qayta yaratilmaydi; qisqa parol rad etiladi", async () => {
    expect(await bootstrapPlatformAdmin({ phone: "901112233", password: "123", name: "A" })).toBe(
      "invalid",
    );
    const exists = await db.user.count({ where: { role: "SUPER_ADMIN" } });
    if (exists) {
      expect(
        await bootstrapPlatformAdmin({ phone: "901112233", password: "uzunparol1", name: "A" }),
      ).toBe("exists");
    }
  });
});

describe("xodimlar", () => {
  it("yangi kassir paroli ishlaydi; bloklansa kira olmaydi; yangi parol eskisini bekor qiladi", async () => {
    const shop = await newShop();
    const { user, password } = await createStaff(shop.tenantId, {
      name: "Kassir",
      phone: phone(),
      role: "CASHIER",
    });
    expect(await authenticateUser({ phone: user.phone, password })).toMatchObject({
      role: "CASHIER",
    });

    const before = Date.now() - 1000;
    const newPassword = await resetStaffPassword(shop.tenantId, shop.owner.id, user.id);
    expect(await authenticateUser({ phone: user.phone, password: newPassword })).not.toBeNull();
    // Eski parol bilan ochilgan sessiya yopildi
    expect(await isSessionActive(sess(user.id, shop.tenantId, before))).toBe(false);

    await setStaffActive(shop.tenantId, shop.owner.id, user.id, false);
    expect(await authenticateUser({ phone: user.phone, password: newPassword })).toBeNull();
    expect(await isSessionActive(sess(user.id, shop.tenantId, Date.now()))).toBe(false);
  });

  it("egasi o'zini va boshqa do'kon xodimini o'zgartira olmaydi", async () => {
    const a = await newShop();
    const b = await newShop();
    await expect(setStaffActive(a.tenantId, a.owner.id, a.owner.id, false)).rejects.toMatchObject({
      message: uz.staff.cannotEditSelf,
    });
    const { user } = await createStaff(b.tenantId, { name: "B", phone: phone(), role: "CASHIER" });
    await expect(setStaffActive(a.tenantId, a.owner.id, user.id, false)).rejects.toMatchObject({
      message: uz.staff.notFound,
    });
    await expect(resetStaffPassword(a.tenantId, a.owner.id, user.id)).rejects.toMatchObject({
      message: uz.staff.notFound,
    });
  });

  it("egasi rolini xodim qilib qo'shib bo'lmaydi (faqat menejer, kassir, omborchi)", async () => {
    const shop = await newShop();
    await expect(
      createStaff(shop.tenantId, { name: "X", phone: phone(), role: "OWNER" as never }),
    ).rejects.toThrow();
  });
});
