import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  clearRegistration,
  getRegistration,
  parseFullName,
  parseShopParam,
  REGISTRATION_TTL_MS,
  setRegistrationName,
  startRegistration,
} from "./registration";

describe("ism familiya", () => {
  it("to'liq ismni qabul qiladi va bo'shliqlarni tartibga soladi", () => {
    expect(parseFullName("  Aziz    Karimov ")).toBe("Aziz Karimov");
    expect(parseFullName("Dilnoza Abdullayeva-Ergasheva")).toBe("Dilnoza Abdullayeva-Ergasheva");
    expect(parseFullName("Oʻlmas Toʻxtayev")).toBe("Oʻlmas Toʻxtayev");
  });

  it("faqat bitta so'z, raqam va juda qisqa matnni rad etadi", () => {
    expect(parseFullName("Aziz")).toBeNull();
    expect(parseFullName("Aziz 123")).toBeNull();
    expect(parseFullName("A B")).toBeNull();
    expect(parseFullName("")).toBeNull();
    expect(parseFullName("x".repeat(81) + " y")).toBeNull();
  });
});

describe("/start parametri", () => {
  it("do'kon havolasini (s_<ID>) tanib oladi", () => {
    expect(parseShopParam("s_clx1a2b3c4d5e6f7g8h9i0j")).toBe("clx1a2b3c4d5e6f7g8h9i0j");
  });

  it("boshqa parametrlarni do'kon sifatida qabul qilmaydi", () => {
    expect(parseShopParam("")).toBeNull();
    expect(parseShopParam("v_abc")).toBeNull();
    expect(parseShopParam("s_")).toBeNull();
    expect(parseShopParam("s_bad id!")).toBeNull();
  });
});

describe("ro'yxatdan o'tish holati", () => {
  it("ism → telefon bosqichlari ketma-ket o'tadi", () => {
    const chat = "100";
    const now = 1_000_000;
    startRegistration(chat, "shop-1", now);
    expect(getRegistration(chat, now)).toMatchObject({ step: "name", tenantId: "shop-1" });

    setRegistrationName(chat, "Aziz Karimov", now);
    expect(getRegistration(chat, now)).toMatchObject({
      step: "phone",
      name: "Aziz Karimov",
      tenantId: "shop-1",
    });
    clearRegistration(chat);
    expect(getRegistration(chat, now)).toBeNull();
  });

  it("muddati o'tgan jarayon bekor bo'ladi", () => {
    const chat = "200";
    startRegistration(chat, "shop-1", 0);
    expect(getRegistration(chat, REGISTRATION_TTL_MS + 1)).toBeNull();
  });
});
