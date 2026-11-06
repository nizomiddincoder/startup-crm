/**
 * Tarif limitlari bajarilishi — integratsiya testlari (haqiqiy baza).
 * Start tarifi: 1 filial. Limitga yetganda createBranch xato beradi,
 * qo'shimcha filial (addon) sotib olingandan keyin yana ochiladi.
 * Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { t, uz } from "@/lib/i18n/uz";
import { createBranch } from "./branches";

const shop = `test-limit-${randomUUID()}`;

beforeAll(async () => {
  await db.tenant.create({
    data: { id: shop, name: "Limit do'kon", plan: "start", planStatus: "TRIAL" },
  });
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: shop } });
  await db.$disconnect();
});

describe("filial limiti (Start: 1)", () => {
  it("birinchi filial ochiladi", async () => {
    const b = await createBranch(shop, { name: "Birinchi filial" });
    expect(b.name).toBe("Birinchi filial");
  });

  it("limitga yetganda — aniq upgrade xatosi", async () => {
    const limit = 1;
    await expect(createBranch(shop, { name: "Ikkinchi filial" })).rejects.toThrow(
      t(uz.subscription.limitBranches, { limit }),
    );
  });

  it("addon filial sotib olingach — yana ochiladi, keyin yana limit", async () => {
    await db.tenant.update({ where: { id: shop }, data: { addonBranches: 1 } });
    const b = await createBranch(shop, { name: "Qo'shimcha filial" });
    expect(b).toBeDefined();
    await expect(createBranch(shop, { name: "To'rtinchi" })).rejects.toThrow(
      t(uz.subscription.limitBranches, { limit: 2 }),
    );
  });
});
