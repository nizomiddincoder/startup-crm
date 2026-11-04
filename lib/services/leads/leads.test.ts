import { beforeEach, describe, expect, it, vi } from "vitest";

// Spam testlari bazaga yetib bormasligi kerak — db soxta, chaqirilsa test yiqiladi
const dbMock = vi.hoisted(() => ({
  lead: {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "lead-1",
      shopName: null,
      utmSource: null,
      utmCampaign: null,
      keyword: null,
      ref: null,
      ...data,
    })),
  },
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { formatPhoneMask } from "@/lib/phone-mask";
import { marketing } from "@/lib/i18n/marketing.uz";
import { uz } from "@/lib/i18n/uz";
import { leadSchema, signupSchema } from "@/lib/validation/lead";
import { createLimiter } from "../rate-limit";
import {
  attributionFromSearch,
  parseAttributionCookie,
  serializeAttribution,
  sourceLabel,
} from "./attribution";
import {
  computeFunnel,
  formatLeadNotification,
  isHoneypotFilled,
  leadsToCsv,
  submitLead,
} from "./leads";

const valid = { name: "Rustam", phone: "90 123 45 67", city: "FERGANA", shopName: "Usta Market" };
const ctx = { ip: "1.2.3.4", attribution: parseAttributionCookie(undefined) };

beforeEach(() => {
  dbMock.lead.findFirst.mockClear();
  dbMock.lead.create.mockClear();
});

describe("spam himoyasi", () => {
  it("spam-tuzoq to'ldirilsa — bazaga yozilmaydi, xabar yuborilmaydi", async () => {
    const notify = vi.fn(async () => {});
    const res = await submitLead({ ...valid, website: "http://spam.example" }, ctx, {
      notify,
      limiter: createLimiter(5, 60_000),
    });
    expect(res).toEqual({ status: "spam" });
    expect(dbMock.lead.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("bo'sh spam-tuzoq — oddiy ariza", () => {
    expect(isHoneypotFilled({ ...valid, website: "" })).toBe(false);
    expect(isHoneypotFilled({ ...valid, website: "  " })).toBe(false);
    expect(isHoneypotFilled(valid)).toBe(false);
  });

  it("bitta IP'dan 5 tadan ko'p ariza — rad etiladi, boshqa IP — o'tadi", async () => {
    const limiter = createLimiter(5, 10 * 60_000);
    for (let i = 0; i < 5; i++) {
      const r = await submitLead({ ...valid, phone: `90 000 00 0${i}` }, ctx, { limiter });
      expect(r.status).toBe("created");
    }
    expect(await submitLead(valid, ctx, { limiter })).toEqual({ status: "rate_limited" });
    expect(dbMock.lead.create).toHaveBeenCalledTimes(5);
    expect((await submitLead(valid, { ...ctx, ip: "5.6.7.8" }, { limiter })).status).toBe(
      "created",
    );
  });

  it("noto'g'ri ma'lumot — Zod xatosi, bazaga yozilmaydi", async () => {
    await expect(
      submitLead({ ...valid, phone: "123" }, ctx, { limiter: createLimiter(5, 60_000) }),
    ).rejects.toThrow();
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });

  it("Telegram ishlamasa ham ariza saqlanadi", async () => {
    const res = await submitLead(valid, ctx, {
      limiter: createLimiter(5, 60_000),
      notify: async () => {
        throw new Error("Telegram down");
      },
    });
    expect(res.status).toBe("created");
  });
});

describe("forma tekshiruvi", () => {
  it("telefonni +998 formatga keltiradi, shahar majburiy", () => {
    expect(leadSchema.parse(valid)).toMatchObject({ phone: "+998901234567", source: "website" });
    expect(leadSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, city: "TASHKENT" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, name: " " }).success).toBe(false);
  });

  it("ro'yxatdan o'tishda rozilik majburiy, boshqa formalarda — yo'q", () => {
    const signup = { ...valid, source: "self_signup" };
    const noConsent = leadSchema.safeParse(signup);
    expect(noConsent.success).toBe(false);
    expect(noConsent.error?.issues[0]).toMatchObject({
      path: ["consent"],
      message: marketing.consent.required,
    });
    expect(leadSchema.parse({ ...signup, consent: "on" }).consent).toBe(true);
    expect(leadSchema.safeParse({ ...valid, source: "pilot" }).success).toBe(true);
    expect(leadSchema.safeParse(valid).success).toBe(true);
  });

  it("ro'yxatdan o'tish: parol kamida 8 belgi, rozilik har doim majburiy", () => {
    const signup = { ...valid, password: "parol-123", consent: "on" };
    expect(signupSchema.parse(signup)).toMatchObject({ phone: "+998901234567", consent: true });
    const short = signupSchema.safeParse({ ...signup, password: "1234567" });
    expect(short.error?.issues[0]).toMatchObject({
      path: ["password"],
      message: marketing.signup.errors.passwordShort,
    });
    const noConsent = signupSchema.safeParse({ ...signup, consent: undefined });
    expect(noConsent.error?.issues[0]?.path).toEqual(["consent"]);
  });

  it("telefon maskasi", () => {
    expect(formatPhoneMask("901234567")).toBe("90 123 45 67");
    expect(formatPhoneMask("+998 90 123-45-67")).toBe("90 123 45 67");
    expect(formatPhoneMask("90123")).toBe("90 123");
    expect(formatPhoneMask("9012345678999")).toBe("90 123 45 67");
  });
});

describe("UTM va ref belgilari", () => {
  it("URL'dan oladi, utm_term — kalit so'z", () => {
    expect(
      attributionFromSearch("?utm_source=instagram&utm_campaign=smeta&utm_term=nasiya"),
    ).toEqual({
      utmSource: "instagram",
      utmCampaign: "smeta",
      keyword: "nasiya",
      ref: undefined,
    });
    expect(attributionFromSearch("?ref=PILOT")?.ref).toBe("PILOT");
    expect(attributionFromSearch("?foo=bar")).toBeNull();
  });

  it("cookie: saqlanadi va qayta o'qiladi; buzilgan qiymat — bo'sh", () => {
    const a = attributionFromSearch("?utm_source=telegram&ref=PILOT")!;
    expect(parseAttributionCookie(serializeAttribution(a))).toEqual(a);
    expect(parseAttributionCookie("%7Bbuzuq")).toEqual({
      utmSource: undefined,
      utmCampaign: undefined,
      keyword: undefined,
      ref: undefined,
    });
    // Juda uzun qiymat tashlab yuboriladi
    expect(
      parseAttributionCookie(serializeAttribution({ utmSource: "x".repeat(500) } as never))
        .utmSource,
    ).toBeUndefined();
  });

  it("manba nomi", () => {
    expect(sourceLabel({ utmSource: "instagram", utmCampaign: "smeta" })).toBe("instagram / smeta");
    expect(sourceLabel({ ref: "PILOT" })).toBe("ref: PILOT");
    expect(sourceLabel({})).toBeNull();
  });
});

describe("Telegram xabari", () => {
  it("ism, telefon, shahar va manba bor; HTML xavfsiz", () => {
    const html = formatLeadNotification({
      name: "Ali <b>",
      phone: "+998901234567",
      city: "ANDIJAN",
      shopName: "Qurilish & Co",
      source: "self_signup",
      utmSource: "instagram",
      utmCampaign: "smeta",
      keyword: null,
      ref: null,
    });
    expect(html).toContain("Ali &lt;b&gt;");
    expect(html).toContain("+998901234567");
    expect(html).toContain(uz.leads.cities.ANDIJAN);
    expect(html).toContain("instagram / smeta");
    expect(html).toContain("Qurilish &amp; Co");
    expect(html).toContain(uz.leads.sources.self_signup);
  });
});

describe("voronka", () => {
  it("bosqichga yetganlar va foiz", () => {
    const f = computeFunnel({ NEW: 4, CALLED: 3, VISITED: 1, PAID: 2, LOST: 10 });
    expect(f.total).toBe(20);
    expect(f.lost).toBe(10);
    const by = Object.fromEntries(f.rows.map((r) => [r.status, r]));
    expect(by.NEW).toMatchObject({ current: 4, reached: 10, percent: 50 });
    expect(by.CALLED).toMatchObject({ current: 3, reached: 6, percent: 30 });
    expect(by.PAID).toMatchObject({ current: 2, reached: 2, percent: 10 });
  });

  it("bo'sh — nol, bo'lishda xato yo'q", () => {
    expect(computeFunnel({}).rows.every((r) => r.percent === 0)).toBe(true);
  });
});

describe("CSV", () => {
  it("BOM, sarlavha, vergul/qo'shtirnoq va formula himoyasi", () => {
    const csv = leadsToCsv([
      {
        id: "1",
        name: '=HYPERLINK("x")',
        phone: "+998901234567",
        city: "FERGANA",
        shopName: "Usta, Market",
        businessType: "construction",
        message: null,
        source: "website",
        utmSource: "instagram",
        utmCampaign: null,
        keyword: null,
        ref: null,
        status: "NEW",
        lostReason: null,
        note: 'U "ertaga" dedi',
        assignee: null,
        consentAt: null,
        createdAt: new Date("2026-10-25T10:00:00Z"),
        updatedAt: new Date(),
      },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    const [header, row] = csv.slice(1).trim().split("\r\n");
    expect(header).toContain(uz.leads.phone);
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain('"Usta, Market"');
    expect(row).toContain('"U ""ertaga"" dedi"');
    expect(row).toContain("'+998901234567");
  });
});
