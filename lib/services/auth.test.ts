import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { authenticateUser, loginBlockedMinutes, type AuthDeps } from "./auth";
import { pinKey } from "./pin";

const PIN = "4821";
let passwordHash: string;

beforeAll(async () => {
  vi.stubEnv("AUTH_SECRET", "test-secret-for-unit-tests");
  passwordHash = await bcrypt.hash("parol123", 4);
});

type Row = Awaited<ReturnType<AuthDeps["findAdmin"]>>;

function row(overrides: Partial<NonNullable<Row>> = {}): NonNullable<Row> {
  return {
    id: "u1",
    name: "Kassir",
    phone: "+998901234567",
    passwordHash,
    role: "CASHIER",
    isActive: true,
    tenantId: "t1",
    tenant: { name: "Do'kon", isActive: true },
    ...overrides,
  };
}

/** Admin: login yoki telefon bo'yicha topadi (kassir emas). */
function depsWith(user: NonNullable<Row> | null = row({ role: "OWNER", login: null })): AuthDeps {
  return {
    findAdmin: async (identifier) =>
      user && (identifier === user.phone || identifier === user.login) ? user : null,
    findCashierByPinKey: async (key) =>
      user && user.role === "CASHIER" && key === pinKey(PIN) ? user : null,
  };
}

const ip = "203.0.113.7";

describe("admin kirishi (login yoki telefon + parol)", () => {
  it("telefon va to'g'ri parol bilan kiradi", async () => {
    const user = await authenticateUser(
      { mode: "admin", identifier: "+998901234567", password: "parol123" },
      ip,
      depsWith(row({ role: "OWNER" })),
    );
    expect(user).toMatchObject({ id: "u1", role: "OWNER", tenantId: "t1" });
  });

  it("login (admin) bilan kiradi", async () => {
    const user = await authenticateUser(
      { mode: "admin", identifier: "admin", password: "parol123" },
      ip,
      depsWith(row({ role: "SUPER_ADMIN", login: "admin", tenantId: "platform" })),
    );
    expect(user).toMatchObject({ role: "SUPER_ADMIN", tenantId: "platform" });
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const user = await authenticateUser(
      { mode: "admin", identifier: "admin", password: "notogri1" },
      ip,
      depsWith(row({ role: "SUPER_ADMIN", login: "admin" })),
    );
    expect(user).toBeNull();
  });

  it("bloklangan foydalanuvchi va o'chirilgan do'kon kirmaydi", async () => {
    const creds = { mode: "admin", identifier: "+998901234567", password: "parol123" };
    expect(
      await authenticateUser(creds, ip, depsWith(row({ role: "OWNER", isActive: false }))),
    ).toBeNull();
    expect(
      await authenticateUser(
        creds,
        ip,
        depsWith(row({ role: "OWNER", tenant: { name: "x", isActive: false } })),
      ),
    ).toBeNull();
  });

  it("5 ta xato urinishdan keyin to'g'ri parol ham vaqtincha qabul qilinmaydi", async () => {
    const identifier = "+998907777777";
    const deps = depsWith(row({ role: "OWNER", phone: identifier }));
    for (let i = 0; i < 5; i++) {
      expect(
        await authenticateUser({ mode: "admin", identifier, password: "notogri1" }, ip, deps),
      ).toBeNull();
    }
    expect(loginBlockedMinutes(identifier)).toBe(15);
    expect(
      await authenticateUser({ mode: "admin", identifier, password: "parol123" }, ip, deps),
    ).toBeNull();
  });

  it("kassir login/parol bilan kira olmaydi (faqat PIN)", async () => {
    // Admin qidiruvi kassirni topmaydi — findAdmin null qaytaradi
    const user = await authenticateUser(
      { mode: "admin", identifier: "+998901234567", password: "parol123" },
      ip,
      { findAdmin: async () => null, findCashierByPinKey: async () => null },
    );
    expect(user).toBeNull();
  });
});

describe("kassir kirishi (4 xonali PIN)", () => {
  it("to'g'ri PIN bilan kassirni qaytaradi", async () => {
    const user = await authenticateUser({ mode: "pin", pin: PIN }, ip, depsWith(row()));
    expect(user).toMatchObject({ id: "u1", role: "CASHIER", tenantId: "t1" });
  });

  it("noto'g'ri PIN rad etiladi", async () => {
    expect(await authenticateUser({ mode: "pin", pin: "0000" }, ip, depsWith(row()))).toBeNull();
  });

  it("4 xonali bo'lmagan PIN rad etiladi", async () => {
    expect(await authenticateUser({ mode: "pin", pin: "123" }, ip, depsWith(row()))).toBeNull();
    expect(await authenticateUser({ mode: "pin", pin: "12a4" }, ip, depsWith(row()))).toBeNull();
  });

  it("10 ta xato PIN'dan keyin shu IP vaqtincha bloklanadi", async () => {
    const attacker = "198.51.100.9";
    for (let i = 0; i < 10; i++) {
      expect(await authenticateUser({ mode: "pin", pin: "0001" }, attacker, depsWith(row()))).toBeNull();
    }
    // Hatto to'g'ri PIN ham shu IP'dan qabul qilinmaydi
    expect(await authenticateUser({ mode: "pin", pin: PIN }, attacker, depsWith(row()))).toBeNull();
    // Boshqa IP — ishlaydi
    expect(
      await authenticateUser({ mode: "pin", pin: PIN }, "192.0.2.50", depsWith(row())),
    ).not.toBeNull();
  });

  it("PIN faqat kassirga tegishli — admin PIN bilan kira olmaydi", async () => {
    const adminDeps: AuthDeps = {
      findAdmin: async () => null,
      findCashierByPinKey: async () => null, // so'rov faqat role=CASHIER bo'yicha
    };
    expect(await authenticateUser({ mode: "pin", pin: PIN }, ip, adminDeps)).toBeNull();
  });

  it("noma'lum mode rad etiladi", async () => {
    expect(await authenticateUser({ pin: PIN }, ip, depsWith(row()))).toBeNull();
    expect(await authenticateUser(null, ip, depsWith(row()))).toBeNull();
  });
});
