import { describe, expect, it } from "vitest";
import { adminLoginSchema, normalizePhone, pinLoginSchema } from "./auth";

describe("normalizePhone", () => {
  it("turli yozuvlarni +998 formatiga keltiradi", () => {
    expect(normalizePhone("90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("+998 90 123-45-67")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
  });

  it("noto'g'ri raqamni rad etadi", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("adminLoginSchema", () => {
  it("login yoki telefon bilan kiradi", () => {
    expect(adminLoginSchema.safeParse({ identifier: "admin", password: "secret1" }).success).toBe(true);
    expect(
      adminLoginSchema.safeParse({ identifier: "90 123 45 67", password: "secret1" }).success,
    ).toBe(true);
  });

  it("bo'sh login va qisqa parolni rad etadi", () => {
    expect(adminLoginSchema.safeParse({ identifier: "", password: "secret1" }).success).toBe(false);
    expect(adminLoginSchema.safeParse({ identifier: "admin", password: "123" }).success).toBe(false);
  });
});

describe("pinLoginSchema", () => {
  it("faqat 4 ta raqamni qabul qiladi", () => {
    expect(pinLoginSchema.safeParse({ pin: "1234" }).success).toBe(true);
    expect(pinLoginSchema.safeParse({ pin: "123" }).success).toBe(false);
    expect(pinLoginSchema.safeParse({ pin: "12345" }).success).toBe(false);
    expect(pinLoginSchema.safeParse({ pin: "12a4" }).success).toBe(false);
  });
});
