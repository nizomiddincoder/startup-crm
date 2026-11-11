/**
 * Botda mijoz ro'yxatdan o'tishi — integratsiya testi (haqiqiy baza, Telegramga hech narsa yuborilmaydi).
 * Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { registerCustomerByChat, resolveShop } from "./registration";

// Real do'kon ID'lari (cuid) kabi — faqat harf-raqam, havola parametriga mos
const shopA = `t${randomUUID().replace(/-/g, "")}`;
const shopB = `t${randomUUID().replace(/-/g, "")}`;
const digits = () => String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
const phone = `+99893${digits()}`;
const chatId = String(Math.floor(Math.random() * 1e9));

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "Reg do'kon A" },
      { id: shopB, name: "Reg do'kon B" },
    ],
  });
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("mijoz ro'yxatdan o'tishi", () => {
  it("yangi raqam — do'konda mijoz yaratiladi va chat ulanadi (xodim emas)", async () => {
    const res = await registerCustomerByChat({
      tenantId: shopA,
      name: "Aziz Karimov",
      phone,
      chatId,
    });
    expect(res).toEqual({ shop: "Reg do'kon A", name: "Aziz Karimov", created: true });

    const customer = await db.customer.findUniqueOrThrow({
      where: { tenantId_phone: { tenantId: shopA, phone } },
    });
    expect(customer.telegramChatId).toBe(chatId);
    expect(customer.isMaster).toBe(false);
    // Xodim jadvaliga hech narsa qo'shilmaydi
    expect(await db.user.count({ where: { telegramChatId: chatId } })).toBe(0);
  });

  it("qayta /start — mavjud mijoz ismi o'zgarmaydi, takror yaratilmaydi", async () => {
    const again = await registerCustomerByChat({
      tenantId: shopA,
      name: "Boshqa Ism",
      phone,
      chatId,
    });
    expect(again?.created).toBe(false);
    expect(again?.name).toBe("Aziz Karimov");
    expect(await db.customer.count({ where: { tenantId: shopA, phone } })).toBe(1);
  });

  it("boshqa do'kondagi shu raqamli mijoz ham chat'ga ulanadi", async () => {
    const otherPhone = `+99894${digits()}`;
    const other = `${chatId}9`;
    await db.customer.create({
      data: { tenantId: shopB, name: "Kassada yozilgan", phone: otherPhone },
    });
    const res = await registerCustomerByChat({
      tenantId: shopA,
      name: "Yangi Mijoz",
      phone: otherPhone,
      chatId: other,
    });
    // Bu do'konda (A) mijoz yo'q — yangisi yaratiladi
    expect(res).toEqual({ shop: "Reg do'kon A", name: "Yangi Mijoz", created: true });
    const linked = await db.customer.findUniqueOrThrow({
      where: { tenantId_phone: { tenantId: shopB, phone: otherPhone } },
    });
    expect(linked.telegramChatId).toBe(other);
    // Faqat shu raqamga tegishli, boshqa mijozga emas
    expect(
      await db.customer.count({ where: { telegramChatId: other, tenantId: shopA } }),
    ).toBe(1);
  });

  it("do'kon havolasi (s_<ID>) do'konni aniqlaydi, noma'lum ID — null", async () => {
    expect(await resolveShop(`s_${shopA}`)).toEqual({ id: shopA, name: "Reg do'kon A" });
    expect(await resolveShop("s_nomalum0000000000")).toBeNull();
  });
});
