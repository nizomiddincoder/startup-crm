import { beforeAll, describe, expect, it, vi } from "vitest";
import { isValidPin, pinKey, randomPin, uniquePin } from "./pin";

beforeAll(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-for-pin");
});

describe("PIN", () => {
  it("faqat 4 ta raqam to'g'ri hisoblanadi", () => {
    expect(isValidPin("0007")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin(1234)).toBe(false);
  });

  it("random PIN doim 4 xonali (boshida nollar bilan)", () => {
    for (let i = 0; i < 200; i++) expect(randomPin()).toMatch(/^\d{4}$/);
  });

  it("kalit deterministik, lekin PIN'dan farqli va sirga bog'liq", () => {
    const original = pinKey("1234");
    expect(pinKey("1234")).toBe(original);
    expect(pinKey("1235")).not.toBe(original);
    expect(original).not.toContain("1234");
    vi.stubEnv("AUTH_SECRET", "boshqa-sir");
    expect(pinKey("1234")).not.toBe(original);
    vi.stubEnv("AUTH_SECRET", "test-secret-for-pin");
  });

  it("band PIN'larni o'tkazib yuboradi (yagonalik)", async () => {
    const taken = new Set<string>();
    const first = await uniquePin(async (k) => taken.has(k));
    taken.add(first.key);
    const second = await uniquePin(async (k) => taken.has(k));
    expect(second.key).not.toBe(first.key);
  });
});
