/**
 * Do'kon yaratish (admin) va xodimlar boshqaruvi — integratsiya testlari. Avval: npm run db:local
 */
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { bootstrapPlatformAdmin, createTenantWithOwner, setTenantActive } from "./admin";
import { authenticateUser, changeOwnPassword, isSessionActive, revokeSession } from "./auth";
import { createStaff, resetStaffPassword, resetStaffPin, setStaffActive } from "./staff";

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
// Har test o'z IP'sidan — PIN cheklovi testlar orasida to'qnashmasin
const ipFor = () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.1`;

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
    const creds = { mode: "admin", identifier: shop.owner.phone, password: shop.password };
    const user = await authenticateUser(creds, ipFor());
    expect(user).toMatchObject({ role: "OWNER", tenantId: shop.tenantId });

    // Kirib turgan egasi ham darhol chiqariladi (sessiya har safar tekshiriladi)
    expect(await isSessionActive(sess(shop.owner.id, shop.tenantId, Date.now()))).toBe(true);
    await setTenantActive(shop.tenantId, false);
    expect(await authenticateUser(creds, ipFor())).toBeNull();
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
    expect(await bootstrapPlatformAdmin({ login: "admin", password: "123", name: "A" })).toBe(
      "invalid",
    );
    const exists = await db.user.count({ where: { role: "SUPER_ADMIN" } });
    if (exists) {
      expect(
        await bootstrapPlatformAdmin({ login: "admin", password: "uzunparol1", name: "A" }),
      ).toBe("exists");
    }
  });
});

describe("xodimlar", () => {
  it("kassir PIN bilan kiradi; PIN yangilansa eskisi ishlamaydi; bloklansa kira olmaydi", async () => {
    const shop = await newShop();
    const { user, pin } = await createStaff(shop.tenantId, {
      name: "Kassir",
      phone: phone(),
      role: "CASHIER",
    });
    if (!pin) throw new Error("kassir uchun PIN qaytishi kerak");
    expect(pin).toMatch(/^\d{4}$/);
    expect(await authenticateUser({ mode: "pin", pin }, ipFor())).toMatchObject({
      role: "CASHIER",
      id: user.id,
    });

    const newPin = await resetStaffPin(shop.tenantId, shop.owner.id, user.id);
    expect(newPin).toMatch(/^\d{4}$/);
    expect(await authenticateUser({ mode: "pin", pin: newPin }, ipFor())).not.toBeNull();

    await setStaffActive(shop.tenantId, shop.owner.id, user.id, false);
    expect(await authenticateUser({ mode: "pin", pin: newPin }, ipFor())).toBeNull();
    expect(await isSessionActive(sess(user.id, shop.tenantId, Date.now()))).toBe(false);
  });

  it("menejer parol bilan kiradi; yangi parol eski sessiyalarni yopadi", async () => {
    const shop = await newShop();
    const { user, password } = await createStaff(shop.tenantId, {
      name: "Menejer",
      phone: phone(),
      role: "MANAGER",
    });
    if (!password) throw new Error("menejer uchun parol qaytishi kerak");
    expect(
      await authenticateUser({ mode: "admin", identifier: user.phone, password }, ipFor()),
    ).toMatchObject({ role: "MANAGER" });

    const before = Date.now() - 1000;
    const newPassword = await resetStaffPassword(shop.tenantId, shop.owner.id, user.id);
    expect(
      await authenticateUser({ mode: "admin", identifier: user.phone, password: newPassword }, ipFor()),
    ).not.toBeNull();
    // Eski parol bilan ochilgan sessiya yopildi
    expect(await isSessionActive(sess(user.id, shop.tenantId, before))).toBe(false);
  });

  it("kassirga parol berib bo'lmaydi, PIN berib bo'lmaydi (xodim menejer bo'lsa)", async () => {
    const shop = await newShop();
    const { user } = await createStaff(shop.tenantId, { name: "K", phone: phone(), role: "CASHIER" });
    await expect(resetStaffPassword(shop.tenantId, shop.owner.id, user.id)).rejects.toMatchObject({
      message: uz.staff.usePin,
    });
    const { user: manager } = await createStaff(shop.tenantId, {
      name: "M",
      phone: phone(),
      role: "MANAGER",
    });
    await expect(resetStaffPin(shop.tenantId, shop.owner.id, manager.id)).rejects.toMatchObject({
      message: uz.staff.notCashier,
    });
  });

  it("egasi parolni sozlamada o'zgartiradi: eski parol kerak; yangisi bilan kiradi", async () => {
    const shop = await newShop();
    expect(await changeOwnPassword(shop.owner.id, "noto'g'ri", "yangiparol1")).toBe("wrong_current");
    expect(await changeOwnPassword(shop.owner.id, shop.password, "yangiparol1")).toBe("ok");
    expect(
      await authenticateUser(
        { mode: "admin", identifier: shop.owner.phone, password: "yangiparol1" },
        ipFor(),
      ),
    ).toMatchObject({ role: "OWNER" });
    expect(
      await authenticateUser(
        { mode: "admin", identifier: shop.owner.phone, password: shop.password },
        ipFor(),
      ),
    ).toBeNull();
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
    await expect(resetStaffPin(a.tenantId, a.owner.id, user.id)).rejects.toMatchObject({
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
