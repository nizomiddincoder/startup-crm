import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { authenticateUser, loginBlockedMinutes, type AuthDeps } from "./auth";

let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash("parol123", 4);
});

function depsWith(overrides: { isActive?: boolean; tenantActive?: boolean } = {}): AuthDeps {
  return {
    findUserByPhone: async (phone) =>
      phone === "+998901234567"
        ? {
            id: "u1",
            name: "Kassir",
            phone,
            passwordHash,
            role: "CASHIER",
            isActive: overrides.isActive ?? true,
            tenantId: "t1",
            tenant: { name: "Do'kon", isActive: overrides.tenantActive ?? true },
          }
        : null,
  };
}

describe("authenticateUser", () => {
  it("to'g'ri parol bilan foydalanuvchini qaytaradi", async () => {
    const user = await authenticateUser(
      { phone: "90 123 45 67", password: "parol123" },
      depsWith(),
    );
    expect(user).toMatchObject({ id: "u1", role: "CASHIER", tenantId: "t1" });
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const user = await authenticateUser({ phone: "901234567", password: "notogri1" }, depsWith());
    expect(user).toBeNull();
  });

  it("noma'lum telefonni rad etadi", async () => {
    const user = await authenticateUser({ phone: "991112233", password: "parol123" }, depsWith());
    expect(user).toBeNull();
  });

  it("bloklangan foydalanuvchini rad etadi", async () => {
    const user = await authenticateUser(
      { phone: "901234567", password: "parol123" },
      depsWith({ isActive: false }),
    );
    expect(user).toBeNull();
  });

  it("o'chirilgan do'kon xodimini rad etadi", async () => {
    const user = await authenticateUser(
      { phone: "901234567", password: "parol123" },
      depsWith({ tenantActive: false }),
    );
    expect(user).toBeNull();
  });

  it("5 ta xato urinishdan keyin to'g'ri parol ham vaqtincha qabul qilinmaydi", async () => {
    const phone = "+998907777777";
    const deps: AuthDeps = {
      findUserByPhone: async (p) =>
        p === phone
          ? {
              id: "u2",
              name: "Kassir",
              phone,
              passwordHash,
              role: "CASHIER",
              isActive: true,
              tenantId: "t1",
              tenant: { name: "Do'kon", isActive: true },
            }
          : null,
    };
    for (let i = 0; i < 5; i++) {
      expect(await authenticateUser({ phone, password: "notogri1" }, deps)).toBeNull();
    }
    expect(loginBlockedMinutes(phone)).toBe(15);
    expect(await authenticateUser({ phone, password: "parol123" }, deps)).toBeNull();
  });

  it("noto'g'ri formatdagi ma'lumotni rad etadi", async () => {
    expect(await authenticateUser({ phone: "abc" }, depsWith())).toBeNull();
  });
});
