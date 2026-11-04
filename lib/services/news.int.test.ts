/**
 * Yangiliklar va AI yordamchi — integratsiya testlari (soxta Telegram va soxta Gemini).
 * Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { askAssistant, systemPrompt } from "./assistant";
import {
  createNews,
  deleteNews,
  getPublishedNews,
  latestSitePoster,
  listPublishedNews,
  markNewsSeen,
  newsImage,
  publishNews,
  unreadNewsCount,
  updateNews,
} from "./news";

const shop = `test-news-${randomUUID()}`;
const created: string[] = [];
let ownerId: string;
let cashierId: string;

function fakeSender() {
  const sent: { chatId: string; html: string; image: boolean }[] = [];
  return {
    sent,
    sender: {
      send: async (chatId: string, html: string, image?: { data: Buffer; mime: string }) => {
        if (chatId === "blocked") throw new Error("403: bot was blocked");
        sent.push({ chatId, html, image: !!image });
      },
    },
  };
}

const base = {
  title: "E2E-test yangilik",
  body: "Kassada endi navbatdagi mijoz bor.\n\nSinab ko'ring!",
};

beforeAll(async () => {
  vi.stubEnv("TELEGRAM_NEWS_CHANNEL", "@kassa_test_news");
  await db.tenant.create({ data: { id: shop, name: "News do'kon" } });
  const mk = (role: "OWNER" | "CASHIER", chat: string | null) =>
    db.user.create({
      data: {
        tenantId: shop,
        name: role,
        role,
        phone: `+99893${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
        passwordHash: "x",
        telegramChatId: chat,
      },
    });
  ownerId = (await mk("OWNER", `owner-${randomUUID()}`)).id;
  cashierId = (await mk("CASHIER", `cashier-${randomUUID()}`)).id;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await db.newsPost.deleteMany({ where: { id: { in: created } } });
  await db.tenant.deleteMany({ where: { id: shop } });
  await db.$disconnect();
});

describe("yangiliklar", () => {
  it("qoralama ko'rinmaydi; chop etilgach sayt, dastur, kanal va egalarga — bir marta", async () => {
    const { id } = await createNews(
      { ...base, onSite: "on", onApp: "on", toChannel: "on", toOwners: "on" },
      { data: Buffer.from("img"), mime: "image/webp" },
    );
    created.push(id);
    expect(await getPublishedNews(id, "site")).toBeNull();
    expect(await newsImage(id)).toBeNull(); // qoralama rasmi ham yopiq

    const fake = fakeSender();
    const result = await publishNews(id, fake.sender);
    expect(result.channel).toBe(true);
    expect(fake.sent[0]).toMatchObject({ chatId: "@kassa_test_news", image: true });
    expect(fake.sent[0].html).toContain("<b>E2E-test yangilik</b>");
    expect(fake.sent[0].html).toContain(`/yangiliklar/${id}`);
    // Egalarga: faqat OWNER (kassirga emas) — bizning do'kon egasi albatta ichida
    const owner = await db.user.findUniqueOrThrow({ where: { id: ownerId } });
    const cashier = await db.user.findUniqueOrThrow({ where: { id: cashierId } });
    const chats = fake.sent.map((s) => s.chatId);
    expect(chats).toContain(owner.telegramChatId);
    expect(chats).not.toContain(cashier.telegramChatId);
    expect(result.owners).toBeGreaterThanOrEqual(1);

    expect((await getPublishedNews(id, "site"))?.title).toBe(base.title);
    expect(await newsImage(id)).not.toBeNull();
    expect((await latestSitePoster())?.id).toBe(id);

    // Qayta chop etish — hech kimga qayta yuborilmaydi
    const again = fakeSender();
    expect(await publishNews(id, again.sender)).toEqual({ channel: false, owners: 0 });
    expect(again.sent).toHaveLength(0);
  });

  it("faqat dasturda: saytda yo'q, dasturda bor; o'qilmaganlar soni", async () => {
    const before = await unreadNewsCount(cashierId);
    const { id } = await createNews({ ...base, title: "Faqat dastur", onApp: "on" });
    created.push(id);
    await publishNews(id, null);
    expect(await getPublishedNews(id, "site")).toBeNull();
    expect((await listPublishedNews("app")).map((p) => p.id)).toContain(id);
    expect(await unreadNewsCount(cashierId)).toBe(before + 1);
    await markNewsSeen(cashierId);
    expect(await unreadNewsCount(cashierId)).toBe(0);
  });

  it("tahrirlash, rasmni olib tashlash, validatsiya, o'chirish", async () => {
    const { id } = await createNews(
      { ...base, onSite: "on" },
      { data: Buffer.from("x"), mime: "image/webp" },
    );
    created.push(id);
    await publishNews(id, null);
    await updateNews(id, { ...base, title: "Yangi sarlavha", onSite: "on" }, null);
    expect((await getPublishedNews(id, "site"))?.imageMime).toBeNull();
    await expect(createNews({ title: "ab", body: "qisqa" })).rejects.toThrow(uz.news.titleShort);
    await deleteNews(id);
    expect(await getPublishedNews(id, "site")).toBeNull();
  });

  it("bloklangan egaga yuborib bo'lmasa — qolganlari davom etadi", async () => {
    const blocked = await db.user.create({
      data: {
        tenantId: shop,
        name: "Bloklagan",
        role: "OWNER",
        phone: `+99894${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
        passwordHash: "x",
        telegramChatId: "blocked",
      },
    });
    const { id } = await createNews({ ...base, toOwners: "on" });
    created.push(id);
    const fake = fakeSender();
    const result = await publishNews(id, fake.sender);
    expect(fake.sent.map((s) => s.chatId)).not.toContain("blocked");
    expect(result.owners).toBe(fake.sent.length);
    await db.user.delete({ where: { id: blocked.id } });
  });
});

describe("AI yordamchi", () => {
  it("rol va yo'riqnoma tizim ko'rsatmasida; javob qaytadi; tarix yuboriladi", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const calls: { system: string; turns: unknown[] }[] = [];
    const answer = await askAssistant(
      { tenantId: shop, userId: cashierId, role: "CASHIER" },
      {
        question: "Tovarni qanday qaytaraman?",
        history: [
          { role: "user", text: "Salom" },
          { role: "model", text: "Assalomu alaykum" },
        ],
      },
      {
        ai: async (system, turns) => {
          calls.push({ system, turns });
          return "Sotuvlar → chek → «Tovarni qaytarish».";
        },
      },
    );
    expect(answer).toContain("Tovarni qaytarish");
    expect(calls[0].system).toContain(uz.roles.CASHIER);
    expect(calls[0].system).toContain("QAYTARISH");
    expect(calls[0].turns).toHaveLength(3);
    expect(systemPrompt("OWNER")).toContain(uz.roles.OWNER);
  });

  it("kunlik limit, AI xatosi va kalitsiz holat", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    vi.stubEnv("ASSISTANT_DAILY_LIMIT", "2");
    const ctx = { tenantId: shop, userId: cashierId, role: "CASHIER" as const };
    await expect(
      askAssistant(
        ctx,
        { question: "Smena?" },
        {
          ai: async () => {
            throw new Error("500");
          },
        },
      ),
    ).rejects.toThrow(uz.assistant.failed);
    // Oldingi test + xato = 2 → limit
    await expect(
      askAssistant(ctx, { question: "Smena?" }, { ai: async () => "ok" }),
    ).rejects.toThrow(uz.assistant.limit);
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(askAssistant(ctx, { question: "Smena?" })).rejects.toThrow(uz.assistant.disabled);
    vi.stubEnv("GEMINI_API_KEY", "test");
  });
});
