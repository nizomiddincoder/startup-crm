/**
 * Telegram: ulanish va rejali xabarlar — integratsiya testlari (haqiqiy baza, soxta yuborish).
 * Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { createCustomer } from "../customers";
import { createProduct } from "../products";
import { createSale } from "../sales";
import { runDailyReports, runMorningDigests, type Send } from "./dispatch";
import {
  consumeLinkCode,
  createLinkCode,
  customerDebtsByChatId,
  getStaffByChatId,
  linkCustomerByPhone,
} from "./linking";

const shopA = `test-a-${randomUUID()}`;
const shopB = `test-b-${randomUUID()}`;
const chat = () => `chat-${randomUUID()}`;
const phone = () => `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

let owner: { id: string };
let cashier: { id: string };
let product: string;

function fakeSend() {
  const sent: { chatId: string; html: string }[] = [];
  const send: Send = async (chatId, html) => {
    sent.push({ chatId, html });
  };
  return { sent, send };
}

const at = (s: string) => new Date(`${s}T12:00:00+05:00`);

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "A do'kon", phone: "+998 90 000 00 01" },
      { id: shopB, name: "B do'kon" },
    ],
  });
  const mk = (tenantId: string, role: "OWNER" | "CASHIER") =>
    db.user.create({
      data: {
        tenantId,
        name: role,
        role,
        phone: `+99895${randomUUID().slice(0, 7)}`,
        passwordHash: "x",
      },
    });
  owner = await mk(shopA, "OWNER");
  cashier = await mk(shopA, "CASHIER");
  product = (await createProduct(shopA, { name: "Tovar", unit: "PIECE", salePrice: 100000 })).id;
});

afterAll(async () => {
  for (const tenantId of [shopA, shopB]) {
    await db.ledgerEntry.deleteMany({ where: { tenantId } });
    await db.stockMovement.deleteMany({ where: { tenantId } });
    await db.sale.deleteMany({ where: { tenantId } });
    await db.customer.deleteMany({ where: { tenantId } });
  }
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("ulanish", () => {
  it("bir martalik kod xodimni bog'laydi, qayta ishlatib bo'lmaydi", async () => {
    const code = await createLinkCode(shopA, owner.id);
    const chatId = chat();
    expect(await consumeLinkCode(code, chatId)).toEqual({ name: "OWNER", shop: "A do'kon" });
    expect((await getStaffByChatId(chatId))?.id).toBe(owner.id);
    expect(await consumeLinkCode(code, chat())).toBeNull();
  });

  it("muddati o'tgan kod ishlamaydi", async () => {
    const code = await createLinkCode(shopA, cashier.id);
    await db.telegramLinkCode.update({
      where: { code },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await consumeLinkCode(code, chat())).toBeNull();
  });

  it("mijoz o'z raqami bilan ikki do'kondagi profiliga ulanadi", async () => {
    const p = phone();
    await createCustomer(shopA, { name: "Ali", phone: p }, true);
    await createCustomer(shopB, { name: "Ali", phone: p }, true);
    const chatId = chat();
    expect((await linkCustomerByPhone(`+998${p}`, chatId)).sort()).toEqual([
      "A do'kon",
      "B do'kon",
    ]);
    expect(await linkCustomerByPhone("+998001112233", chat())).toEqual([]);
  });
});

describe("rejali xabarlar", () => {
  it("kunlik hisobot faqat egasi/menejerga, kuniga bir marta", async () => {
    const ownerChat = chat();
    await db.user.update({ where: { id: owner.id }, data: { telegramChatId: ownerChat } });
    await db.user.update({ where: { id: cashier.id }, data: { telegramChatId: chat() } });

    await createSale(shopA, cashier.id, {
      items: [{ productId: product, quantity: "3" }],
      payments: { cash: 300000, card: 0, transfer: 0 },
    });

    const now = new Date();
    const first = fakeSend();
    expect(await runDailyReports(first.send, now, [shopA])).toBe(1);
    expect(first.sent[0].chatId).toBe(ownerChat);
    expect(first.sent[0].html).toContain("300 000 so'm");

    const second = fakeSend();
    expect(await runDailyReports(second.send, now, [shopA])).toBe(0);
  });

  it("ertalab: egasiga xulosa, mijozga eslatma; ertasi kuni eslatma takrorlanmaydi (3 kun qoidasi)", async () => {
    const custChat = chat();
    const c = await createCustomer(shopA, { name: "Qarzdor Vali", phone: phone() }, true);
    await db.customer.update({ where: { id: c.id }, data: { telegramChatId: custChat } });
    await createSale(shopA, cashier.id, {
      customerId: c.id,
      items: [{ productId: product, quantity: "1" }],
      payments: { cash: 0, card: 0, transfer: 0, debt: 100000 },
      dueDate: "2026-01-10",
    });

    const day1 = at("2026-01-12"); // muddati 2 kun oldin o'tgan
    const s1 = fakeSend();
    await runMorningDigests(s1.send, day1, [shopA]);
    const ownerMsg = s1.sent.find((m) => m.html.includes(uz.bot.digestOverdue));
    expect(ownerMsg?.html).toContain("Qarzdor Vali");
    const reminder = s1.sent.find((m) => m.chatId === custChat);
    expect(reminder?.html).toContain("100 000 so'm");
    expect(reminder?.html).toContain("10.01.2026");

    const s2 = fakeSend();
    await runMorningDigests(s2.send, at("2026-01-13"), [shopA]);
    expect(s2.sent.some((m) => m.chatId === custChat)).toBe(false);

    const s3 = fakeSend();
    await runMorningDigests(s3.send, at("2026-01-15"), [shopA]);
    expect(s3.sent.some((m) => m.chatId === custChat)).toBe(true);

    const debts = await customerDebtsByChatId(custChat, at("2026-01-15"));
    expect(debts).toEqual([expect.objectContaining({ shop: "A do'kon", debt: 100000 })]);
  });

  it("yuborishda xato (bot bloklangan) boshqalarni to'xtatmaydi", async () => {
    const failing: Send = async () => {
      throw new Error("Forbidden: bot was blocked by the user");
    };
    await expect(runDailyReports(failing, at("2026-02-01"), [shopA])).resolves.toBe(0);
  });
});
