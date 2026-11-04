import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatQuantity } from "./format";

describe("format", () => {
  it("Toshkent vaqtida sana va soat", () => {
    expect(formatDateTime(new Date("2026-10-24T16:05:00Z"))).toBe("24.10.2026 21:05");
    expect(formatDate(new Date("2026-10-24T20:00:00Z"))).toBe("25.10.2026");
  });

  it("miqdorni ortiqcha nollarsiz, vergul bilan yozadi", () => {
    expect(formatQuantity("1.500")).toBe("1,5");
    expect(formatQuantity("2.000")).toBe("2");
    expect(formatQuantity("10")).toBe("10");
    expect(formatQuantity("0.125")).toBe("0,125");
  });
});
