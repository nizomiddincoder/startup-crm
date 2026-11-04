/**
 * Arizalar: forma → baza → Telegram xabari zanjiri (haqiqiy baza, soxta Telegram).
 * Avval: npm run db:local
 */
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { createLimiter } from "../rate-limit";
import { attributionFromSearch, parseAttributionCookie, serializeAttribution } from "./attribution";
import { getLead, leadFunnel, listLeads, submitLead, updateLead } from "./leads";

const phones: string[] = [];
function phone() {
  const p = `33${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  phones.push(`+998${p}`);
  return p;
}

function telegram() {
  const sent: string[] = [];
  return { sent, notify: async (html: string) => void sent.push(html) };
}

const fresh = () => createLimiter(100, 60_000);

afterAll(async () => {
  await db.lead.deleteMany({ where: { phone: { in: phones } } });
  await db.$disconnect();
});

describe("forma → baza → Telegram", () => {
  it("UTM belgilari bilan ariza saqlanadi va admin'ga to'liq xabar boradi", async () => {
    // Brauzer cookie'si: ?utm_source=instagram&utm_campaign=smeta&utm_term=nasiya&ref=PILOT
    const cookie = serializeAttribution(
      attributionFromSearch("?utm_source=instagram&utm_campaign=smeta&utm_term=nasiya&ref=PILOT")!,
    );
    const tg = telegram();
    const p = phone();
    const res = await submitLead(
      { name: "Rustam aka", phone: p, city: "NAMANGAN", shopName: "Usta Market", website: "" },
      { ip: "10.0.0.1", attribution: parseAttributionCookie(cookie) },
      { notify: tg.notify, limiter: fresh() },
    );
    expect(res.status).toBe("created");

    const lead = await getLead((res as { id: string }).id);
    expect(lead).toMatchObject({
      name: "Rustam aka",
      phone: `+998${p}`,
      city: "NAMANGAN",
      shopName: "Usta Market",
      source: "website",
      utmSource: "instagram",
      utmCampaign: "smeta",
      keyword: "nasiya",
      ref: "PILOT",
      status: "NEW",
    });

    expect(tg.sent).toHaveLength(1);
    expect(tg.sent[0]).toContain("Rustam aka");
    expect(tg.sent[0]).toContain(`+998${p}`);
    expect(tg.sent[0]).toContain(uz.leads.cities.NAMANGAN);
    expect(tg.sent[0]).toContain("instagram / smeta");
  });

  it("/register orqali — source=self_signup, rozilik vaqti saqlanadi", async () => {
    const tg = telegram();
    const res = await submitLead(
      { name: "Sinov", phone: phone(), city: "FERGANA", source: "self_signup", consent: "on" },
      { ip: "10.0.0.2", attribution: parseAttributionCookie(undefined) },
      { notify: tg.notify, limiter: fresh() },
    );
    const lead = await getLead((res as { id: string }).id);
    expect(lead?.source).toBe("self_signup");
    expect(lead?.consentAt).toBeInstanceOf(Date);
    expect(tg.sent[0]).toContain(uz.leads.sources.self_signup);
    expect(tg.sent[0]).toContain(uz.leads.direct);
  });

  it("bir xil telefon 24 soatda qayta yuborsa — yangi ariza va xabar yo'q", async () => {
    const tg = telegram();
    const p = phone();
    const input = { name: "Takror", phone: p, city: "ANDIJAN" };
    const c = { ip: "10.0.0.3", attribution: parseAttributionCookie(undefined) };
    const first = await submitLead(input, c, { notify: tg.notify, limiter: fresh() });
    const second = await submitLead(input, c, { notify: tg.notify, limiter: fresh() });
    expect(second).toEqual({ status: "duplicate", id: (first as { id: string }).id });
    expect(await db.lead.count({ where: { phone: `+998${p}` } })).toBe(1);
    expect(tg.sent).toHaveLength(1);
  });

  it("spam-tuzoq — bazada hech narsa yo'q, xabar yo'q", async () => {
    const tg = telegram();
    const p = phone();
    const res = await submitLead(
      { name: "Bot", phone: p, city: "OTHER", website: "spam" },
      { ip: "10.0.0.4", attribution: parseAttributionCookie(undefined) },
      { notify: tg.notify, limiter: fresh() },
    );
    expect(res.status).toBe("spam");
    expect(await db.lead.count({ where: { phone: `+998${p}` } })).toBe(0);
    expect(tg.sent).toHaveLength(0);
  });
});

describe("admin", () => {
  it("holat, izoh, mas'ul; sabab faqat 'yo'qotildi'da saqlanadi; filtr va voronka", async () => {
    const res = await submitLead(
      { name: "Admin test", phone: phone(), city: "FERGANA" },
      { ip: "10.0.0.5", attribution: parseAttributionCookie(undefined) },
      { limiter: fresh() },
    );
    const id = (res as { id: string }).id;

    await updateLead(id, {
      status: "CALLED",
      note: "Ertaga qayta",
      assignee: "Jasur",
      lostReason: "x",
    });
    expect(await getLead(id)).toMatchObject({
      status: "CALLED",
      note: "Ertaga qayta",
      assignee: "Jasur",
      lostReason: null,
    });

    await updateLead(id, { status: "LOST", lostReason: "Narx qimmat" });
    expect(await getLead(id)).toMatchObject({
      status: "LOST",
      lostReason: "Narx qimmat",
      note: null,
    });

    expect((await listLeads({ status: "LOST", city: "FERGANA" })).some((l) => l.id === id)).toBe(
      true,
    );
    expect((await listLeads({ status: "NEW" })).some((l) => l.id === id)).toBe(false);

    const funnel = await leadFunnel();
    expect(funnel.lost).toBeGreaterThanOrEqual(1);
    expect(funnel.total).toBeGreaterThanOrEqual(funnel.lost);
  });
});
