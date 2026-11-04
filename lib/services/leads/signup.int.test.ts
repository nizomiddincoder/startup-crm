/**
 * O'zi ro'yxatdan o'tish: do'kon + egasi + namunaviy katalog + ariza (haqiqiy baza, soxta Telegram).
 * Avval: npm run db:local
 */
import { afterAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { marketing } from "@/lib/i18n/marketing.uz";
import { authenticateUser } from "../auth";
import { createLimiter } from "../rate-limit";
import { parseAttributionCookie } from "./attribution";
import { selfSignup, TRIAL_DAYS } from "./signup";
import { STARTER_CATALOG } from "./starter-catalog";

const phones: string[] = [];
function phone() {
  const p = `33${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  phones.push(`+998${p}`);
  return p;
}

const ctx = { ip: "10.0.1.1", attribution: parseAttributionCookie(undefined) };
const fresh = () => createLimiter(100, 60_000);
const valid = (p: string) => ({
  name: "Sinov Egasi",
  phone: p,
  city: "ANDIJAN",
  shopName: "Sinov Qurilish",
  password: "parol-12345",
  consent: "on",
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { users: { some: { phone: { in: phones } } } } });
  await db.lead.deleteMany({ where: { phone: { in: phones } } });
  await db.$disconnect();
});

describe("o'zi ro'yxatdan o'tish", () => {
  it("do'kon, egasi (OWNER), sinov muddati, katalog va ariza yaratiladi; login ishlaydi", async () => {
    const sent: string[] = [];
    const p = phone();
    const now = new Date("2026-10-25T10:00:00Z");
    const res = await selfSignup(
      valid(p),
      { ...ctx, now },
      { limiter: fresh(), notify: async (html) => void sent.push(html) },
    );
    expect(res.status).toBe("created");
    if (res.status !== "created") return;

    const tenant = await db.tenant.findUniqueOrThrow({
      where: { id: res.tenantId },
      include: { users: true, _count: { select: { products: true, categories: true } } },
    });
    expect(tenant.name).toBe("Sinov Qurilish");
    expect(tenant.trialEndsAt?.getTime()).toBe(now.getTime() + TRIAL_DAYS * 86_400_000);
    expect(tenant.users).toHaveLength(1);
    expect(tenant.users[0]).toMatchObject({ role: "OWNER", phone: `+998${p}` });
    expect(tenant._count.categories).toBe(STARTER_CATALOG.length);
    expect(tenant._count.products).toBe(STARTER_CATALOG.flatMap((g) => g.products).length);

    const lead = await db.lead.findFirstOrThrow({ where: { phone: `+998${p}` } });
    expect(lead.source).toBe("self_signup");
    expect(lead.consentAt).toEqual(now);
    expect(sent).toHaveLength(1);

    const user = await authenticateUser({ phone: p, password: "parol-12345" });
    expect(user?.tenantId).toBe(res.tenantId);
  });

  it("band telefon — xato, ikkinchi do'kon ochilmaydi", async () => {
    const p = phone();
    await selfSignup(valid(p), ctx, { limiter: fresh() });
    await expect(selfSignup(valid(p), ctx, { limiter: fresh() })).rejects.toThrow(
      marketing.signup.errors.phoneTaken,
    );
    expect(await db.user.count({ where: { phone: `+998${p}` } })).toBe(1);
  });

  it("rozilik yoki parol bo'lmasa — Zod xatosi, bazaga hech narsa yozilmaydi", async () => {
    const p = phone();
    await expect(
      selfSignup({ ...valid(p), consent: undefined }, ctx, { limiter: fresh() }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      selfSignup({ ...valid(p), password: "123" }, ctx, { limiter: fresh() }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(await db.user.count({ where: { phone: `+998${p}` } })).toBe(0);
  });

  it("do'kon nomi yozilmasa — egasi nomidan", async () => {
    const p = phone();
    const res = await selfSignup({ ...valid(p), shopName: "" }, ctx, { limiter: fresh() });
    if (res.status !== "created") throw new Error(res.status);
    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: res.tenantId } });
    expect(tenant.name).toBe("Sinov Egasi do'koni");
  });

  it("spam-tuzoq va IP cheklovi — do'kon ochilmaydi", async () => {
    const p = phone();
    expect(await selfSignup({ ...valid(p), website: "x" }, ctx, { limiter: fresh() })).toEqual({
      status: "spam",
    });
    const limiter = createLimiter(1, 60_000);
    limiter.fail(ctx.ip);
    expect(await selfSignup(valid(p), ctx, { limiter })).toEqual({ status: "rate_limited" });
    expect(await db.user.count({ where: { phone: `+998${p}` } })).toBe(0);
  });
});
