/**
 * Mijozlar, nasiya va usta bonusi — integratsiya testlari (haqiqiy baza). Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import {
  createCustomer,
  getAccountBalances,
  getCustomer,
  listCustomers,
  payMasterBonus,
  receiveDebtPayment,
  searchCustomers,
  updateCustomer,
} from "./customers";
import { createProduct } from "./products";
import { createSale } from "./sales";

const shopA = `test-a-${randomUUID()}`;
const shopB = `test-b-${randomUUID()}`;
let userA: string;
let product: string; // 100 000 so'm / dona

const phone = () => `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

async function balances(tenantId: string, id: string) {
  return (await getAccountBalances(tenantId, [id])).get(id)!;
}

function sell(extra: Record<string, unknown>, quantity = "1") {
  return createSale(shopA, userA, {
    items: [{ productId: product, quantity }],
    payments: { cash: 0, card: 0, transfer: 0 },
    ...extra,
  });
}

beforeAll(async () => {
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "A" },
      { id: shopB, name: "B" },
    ],
  });
  const user = await db.user.create({
    data: {
      tenantId: shopA,
      name: "Kassir",
      phone: `+99897${randomUUID().slice(0, 7)}`,
      passwordHash: "x",
    },
  });
  userA = user.id;
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

describe("mijozlar", () => {
  it("telefonni formatlaydi, do'kon ichida takrorlanmaydi; kassir usta/limitni o'zgartira olmaydi", async () => {
    const p = phone();
    const c = await createCustomer(
      shopA,
      { name: "Ali", phone: p, isMaster: true, creditLimit: "5000" },
      false,
    );
    expect(c.phone).toBe(`+998${p}`);
    expect(c.isMaster).toBe(false); // kassir yaratdi — usta belgisi qo'yilmadi
    expect(c.creditLimit).toBeNull();

    await expect(createCustomer(shopA, { name: "Boshqa", phone: p }, true)).rejects.toMatchObject({
      field: "phone",
      message: uz.customers.phoneTaken,
    });
    await expect(createCustomer(shopB, { name: "B dagi", phone: p }, true)).resolves.toBeTruthy();

    await updateCustomer(
      shopA,
      c.id,
      { name: "Ali aka", phone: p, isMaster: true, bonusPercent: "2,5" },
      true,
    );
    const saved = await getCustomer(shopA, c.id);
    expect(saved?.customer).toMatchObject({ name: "Ali aka", isMaster: true, bonusPercent: "2.5" });

    expect((await searchCustomers(shopA, p.slice(-4))).map((x) => x.id)).toContain(c.id);
    expect(await getCustomer(shopB, c.id)).toBeNull();
  });
});

describe("nasiya", () => {
  it("nasiyaga sotish mijozsiz mumkin emas", async () => {
    await expect(
      sell({ payments: { cash: 0, card: 0, transfer: 0, debt: 100000 } }),
    ).rejects.toMatchObject({
      message: uz.customers.customerRequired,
    });
  });

  it("qisman nasiya qarzni oshiradi, to'lov kamaytiradi, ortiqcha to'lov rad etiladi", async () => {
    const c = await createCustomer(shopA, { name: "Qarzdor", phone: phone() }, true);
    const sale = await sell({
      customerId: c.id,
      payments: { cash: 40000, card: 0, transfer: 0, debt: 60000 },
      dueDate: "2026-11-15",
    });
    expect(await balances(shopA, c.id)).toEqual({ debt: 60000, bonus: 0, points: 0 });

    const detail = await getCustomer(shopA, c.id);
    expect(detail?.entries[0]).toMatchObject({ type: "SALE", amount: 60000 });
    expect(detail?.entries[0].sale?.id).toBe(sale.id);
    expect(detail?.entries[0].dueDate?.toISOString()).toBe("2026-11-14T19:00:00.000Z");

    await expect(
      receiveDebtPayment(shopA, userA, c.id, { amount: "70 000", method: "CASH" }),
    ).rejects.toMatchObject({ message: uz.customers.paymentTooLarge });
    await receiveDebtPayment(shopA, userA, c.id, { amount: "25 000", method: "CARD" });
    expect((await balances(shopA, c.id)).debt).toBe(35000);

    const debtors = await listCustomers(shopA, { debtorsOnly: true });
    expect(debtors.items.map((x) => x.id)).toContain(c.id);
  });

  it("nasiya limitidan oshib bo'lmaydi", async () => {
    const c = await createCustomer(
      shopA,
      { name: "Limitli", phone: phone(), creditLimit: "150 000" },
      true,
    );
    await sell({ customerId: c.id, payments: { cash: 0, card: 0, transfer: 0, debt: 100000 } });
    await expect(
      sell({ customerId: c.id, payments: { cash: 0, card: 0, transfer: 0, debt: 100000 } }),
    ).rejects.toMatchObject({ message: uz.customers.creditLimitExceeded });
    expect((await balances(shopA, c.id)).debt).toBe(100000);
  });

  it("boshqa do'kon mijoziga nasiya yozib, to'lov qabul qilib bo'lmaydi", async () => {
    const foreign = await createCustomer(shopB, { name: "Begona", phone: phone() }, true);
    await expect(
      sell({ customerId: foreign.id, payments: { cash: 0, card: 0, transfer: 0, debt: 100000 } }),
    ).rejects.toMatchObject({ message: uz.customers.notFound });
    await expect(
      receiveDebtPayment(shopA, userA, foreign.id, { amount: 1000, method: "CASH" }),
    ).rejects.toMatchObject({ message: uz.customers.notFound });
  });
});

describe("usta bonusi", () => {
  it("usta olib kelgan sotuvdan foiz hisoblanadi, chekda emas — faqat daftarda", async () => {
    const master = await createCustomer(
      shopA,
      { name: "Usta Karim", phone: phone(), isMaster: true, bonusPercent: "3" },
      true,
    );
    await sell({ masterId: master.id, payments: { cash: 200000, card: 0, transfer: 0 } }, "2");
    expect(await balances(shopA, master.id)).toEqual({ debt: 0, bonus: 6000, points: 0 });

    // Usta bo'lmagan mijozni usta sifatida berib bo'lmaydi
    const plain = await createCustomer(shopA, { name: "Oddiy", phone: phone() }, true);
    await expect(
      sell({ masterId: plain.id, payments: { cash: 100000, card: 0, transfer: 0 } }),
    ).rejects.toMatchObject({ message: uz.customers.notMaster });
  });

  it("bonus naqd beriladi yoki ustaning qarzidan ayiriladi; qoldiqdan ortiq berilmaydi", async () => {
    const master = await createCustomer(
      shopA,
      { name: "Usta Sobir", phone: phone(), isMaster: true, bonusPercent: "5" },
      true,
    );
    // Usta mijoz olib keldi: 4 × 100 000 → bonus 20 000
    await sell({ masterId: master.id, payments: { cash: 400000, card: 0, transfer: 0 } }, "4");
    // Usta o'zi nasiyaga oldi: qarz 100 000 (o'z xaridi uchun ham bonus: 5 000)
    await sell({
      customerId: master.id,
      masterId: master.id,
      payments: { cash: 0, card: 0, transfer: 0, debt: 100000 },
    });
    expect(await balances(shopA, master.id)).toEqual({ debt: 100000, bonus: 25000, points: 0 });

    await expect(
      payMasterBonus(shopA, userA, master.id, { amount: 30000, method: "CASH" }),
    ).rejects.toMatchObject({ message: uz.customers.payoutTooLarge });

    await payMasterBonus(shopA, userA, master.id, { amount: "10 000", method: "CASH" });
    await payMasterBonus(shopA, userA, master.id, { amount: "15 000", method: "DEBT" });
    expect(await balances(shopA, master.id)).toEqual({ debt: 85000, bonus: 0, points: 0 });

    const types = (await getCustomer(shopA, master.id))?.entries.map(
      (e) => `${e.account}:${e.type}`,
    );
    expect(types).toEqual(
      expect.arrayContaining(["BONUS:PAYOUT", "DEBT:PAYMENT", "BONUS:ACCRUAL", "DEBT:SALE"]),
    );
  });

  it("qarzi bonusdan kam bo'lsa, qarzdan ayirish rad etiladi", async () => {
    const master = await createCustomer(
      shopA,
      { name: "Usta Nodir", phone: phone(), isMaster: true, bonusPercent: "10" },
      true,
    );
    await sell({ masterId: master.id, payments: { cash: 100000, card: 0, transfer: 0 } });
    await expect(
      payMasterBonus(shopA, userA, master.id, { amount: 10000, method: "DEBT" }),
    ).rejects.toMatchObject({ message: uz.customers.offsetTooLarge });
  });
});
