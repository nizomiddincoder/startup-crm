import { describe, expect, it } from "vitest";
import { loginSchema, normalizePhone } from "./auth";

describe("normalizePhone", () => {
  it("turli yozuvlarni bir formatga keltiradi", () => {
    expect(normalizePhone("901234567")).toBe("+998901234567");
    expect(normalizePhone("+998 90 123-45-67")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
  });

  it("noto'g'ri raqamni rad etadi", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+7 900 123 45 67")).toBeNull();
  });
});

describe("loginSchema", () => {
  it("to'g'ri ma'lumotni qabul qiladi", () => {
    const result = loginSchema.safeParse({ phone: "90 123 45 67", password: "secret1" });
    expect(result.success).toBe(true);
    expect(result.data?.phone).toBe("+998901234567");
  });

  it("qisqa parolni rad etadi", () => {
    expect(loginSchema.safeParse({ phone: "901234567", password: "123" }).success).toBe(false);
  });
});
