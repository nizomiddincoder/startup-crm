/**
 * Raqam orqali ulanish, kirishni Telegramda tasdiqlash, mijozni kassada kod bilan tasdiqlash va
 * "Yordam" so'rovi — integratsiya testlari (haqiqiy baza, Telegramga hech narsa yuborilmaydi).
 * Avval: npm run db:local
 */
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { authenticateUser, verifyAdmin } from "../auth";
import { createCustomer } from "../customers";
import { createSupportRequest } from "../support";
import {
  confirmCustomerCode,
  openVerification,
  startCustomerVerification,
  verificationContact,
  verificationState,
} from "./customer-verify";
import { getStaffByChatId, linkStaffByPhone } from "./linking";
import {
  answerChallenge,
  createLoginChallenge,
  getChallengeState,
  loginConfirmRequired,
} from "./login-confirm";

const shop = `test-tg-${randomUUID()}`;
const digits = () => String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
const userPhone = `+99897${digits()}`;
const customerPhone = `+99896${digits()}`;
let userId: string;
let customerId: string;

beforeAll(async () => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:TEST");
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "kassa_test_bot");
  await db.tenant.create({ data: { id: shop, name: "TG do'kon" } });
  userId = (
    await db.user.create({
      data: {
        tenantId: shop,
        name: "Kassir Tg",
        role: "MANAGER",
        phone: userPhone,
        passwordHash: await bcrypt.hash("parol-123", 4),
      },
    })
  ).id;
  customerId = (await createCustomer(shop, { name: "Mijoz", phone: customerPhone }, true)).id;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await db.tenant.deleteMany({ where: { id: shop } });
  await db.$disconnect();
});

describe("xodim raqam orqali ulanadi", () => {
  it("telefon bo'yicha topiladi va chat bog'lanadi; noma'lum raqam — null", async () => {
    const chatId = `chat-${randomUUID()}`;
    const linked = await linkStaffByPhone(userPhone.replace("+998", "+998 "), chatId);
    expect(linked).toMatchObject({ name: "Kassir Tg", role: "MANAGER", shop: "TG do'kon" });
    expect((await getStaffByChatId(chatId))?.id).toBe(userId);
    expect(await linkStaffByPhone("+998000000000", chatId)).toBeNull();
  });
});

describe("kirishni Telegramda tasdiqlash", () => {
  it("tasdiqsiz sessiya ochilmaydi; tasdiqlangach bir marta ochiladi", async () => {
    const creds = { mode: "admin", identifier: userPhone, password: "parol-123" };
    const verified = await verifyAdmin(creds);
    expect(verified && loginConfirmRequired(verified)).toBe(true);

    // Tasdiqsiz (yoki challengeId'siz) — kirib bo'lmaydi
    expect(await authenticateUser(creds)).toBeNull();
    const id = await createLoginChallenge(userId);
    expect(await authenticateUser({ ...creds, challengeId: id })).toBeNull();

    // Boshqa chat tasdiqlay olmaydi
    expect(await answerChallenge(id, "begona-chat", true)).toBeNull();
    const chatId = (await db.user.findUniqueOrThrow({ where: { id: userId } })).telegramChatId!;
    expect(await answerChallenge(id, chatId, true)).toBe("APPROVED");
    expect(await getChallengeState(id)).toBe("APPROVED");

    expect(await authenticateUser({ ...creds, challengeId: id })).toMatchObject({ id: userId });
    // Ikkinchi marta ishlatib bo'lmaydi
    expect(await authenticateUser({ ...creds, challengeId: id })).toBeNull();
    expect(await getChallengeState(id)).toBe("CONSUMED");
  });

  it("rad etilgan va eskirgan so'rov", async () => {
    const chatId = (await db.user.findUniqueOrThrow({ where: { id: userId } })).telegramChatId!;
    const denied = await createLoginChallenge(userId);
    expect(await answerChallenge(denied, chatId, false)).toBe("DENIED");
    expect(await answerChallenge(denied, chatId, true)).toBeNull();

    const old = await createLoginChallenge(userId, new Date(Date.now() - 10 * 60 * 1000));
    expect(await getChallengeState(old)).toBe("EXPIRED");
    expect(await answerChallenge(old, chatId, true)).toBeNull();
  });

  it("tasdiqlash o'chirilsa — faqat parol", async () => {
    await db.user.update({ where: { id: userId }, data: { telegramLoginConfirm: false } });
    expect(await authenticateUser({ mode: "admin", identifier: userPhone, password: "parol-123" })).toMatchObject({
      id: userId,
    });
    await db.user.update({ where: { id: userId }, data: { telegramLoginConfirm: true } });
  });
});

describe("mijozni kassada tasdiqlash", () => {
  it("QR → bot → raqam mos → kod → kassir kiritadi", async () => {
    const { id, url } = await startCustomerVerification(shop, customerId);
    expect(url).toBe(`https://t.me/kassa_test_bot?start=v_${id}`);
    const chatId = `chat-${randomUUID()}`;
    expect(await openVerification(id, chatId)).toEqual({ shop: "TG do'kon" });

    // Boshqa raqam — mos emas
    expect(await verificationContact(chatId, "+998911111111")).toEqual({ mismatch: true });
    const sent = await verificationContact(chatId, customerPhone);
    expect(sent && "code" in sent && /^\d{4}$/.test(sent.code)).toBe(true);
    expect(await verificationState(shop, customerId)).toBe("CODE_SENT");

    const code = (sent as { code: string }).code;
    await expect(
      confirmCustomerCode(shop, customerId, code === "0000" ? "1111" : "0000"),
    ).rejects.toThrow(uz.telegram.verifyWrongCode);
    await confirmCustomerCode(shop, customerId, code);
    const customer = await db.customer.findUniqueOrThrow({ where: { id: customerId } });
    expect(customer.telegramChatId).toBe(chatId);
    expect(customer.telegramVerifiedAt).toBeInstanceOf(Date);
    expect(await verificationState(shop, customerId)).toBe("DONE");
  });

  it("telefonsiz mijoz — avval raqam kerak; boshqa do'kon mijozi — topilmaydi", async () => {
    const noPhone = (await createCustomer(shop, { name: "Raqamsiz" }, true)).id;
    await expect(startCustomerVerification(shop, noPhone)).rejects.toThrow(
      uz.telegram.verifyNeedPhone,
    );
    await expect(startCustomerVerification("boshqa-dokon", customerId)).rejects.toThrow(
      uz.customers.notFound,
    );
  });
});

describe("Yordam so'rovi", () => {
  it("bazaga yoziladi va admin'ga do'kon, xodim va sahifa bilan boradi", async () => {
    const sent: string[] = [];
    const { id } = await createSupportRequest(
      shop,
      userId,
      { message: "Chek chiqmayapti <b>", page: "/pos", errorCode: "abc123" },
      { notify: async (html) => void sent.push(html) },
    );
    const row = await db.supportRequest.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ tenantId: shop, page: "/pos", resolved: false });
    expect(sent[0]).toContain("TG do'kon");
    expect(sent[0]).toContain("Chek chiqmayapti &lt;b&gt;");
    expect(sent[0]).toContain("abc123");
    await expect(createSupportRequest(shop, userId, { message: "ha" })).rejects.toThrow();
  });
});
