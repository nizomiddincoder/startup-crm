import { describe, expect, it } from "vitest";
import { formatAmount, formatSum, parseSum } from "./money";

describe("parseSum", () => {
  it("turli yozuvlarni butun songa aylantiradi", () => {
    expect(parseSum("125 000")).toBe(125000);
    expect(parseSum("125,000")).toBe(125000);
    expect(parseSum(" 85000 so'm ")).toBe(85000);
    expect(parseSum("0")).toBe(0);
  });

  it("noto'g'ri qiymatni rad etadi", () => {
    expect(parseSum("")).toBeNull();
    expect(parseSum("12.5")).toBeNull();
    expect(parseSum("-100")).toBeNull();
    expect(parseSum("abc")).toBeNull();
  });
});

describe("formatSum", () => {
  it("minglarni bo'sh joy bilan ajratadi", () => {
    expect(formatSum(1250000)).toBe("1 250 000 so'm");
  });

  it("manfiy summani ko'rsatadi", () => {
    expect(formatSum(-5000)).toBe("-5 000 so'm");
  });

  it("formatAmount valyutasiz yozadi va parseSum bilan qaytadi", () => {
    expect(formatAmount(62000)).toBe("62 000");
    expect(parseSum(formatAmount(10800000))).toBe(10800000);
  });

  it("kasr sonni rad etadi", () => {
    expect(() => formatSum(10.5)).toThrow();
  });
});
