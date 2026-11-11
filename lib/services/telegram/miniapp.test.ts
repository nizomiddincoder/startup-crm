/**
 * Telegram initData imzo tekshiruvi (HMAC-SHA256, rasmiy algoritm) — unit testlar.
 * Haqiqiy imzo o'zimiz hisoblanadi, shuning uchun bot tokeni soxta bo'lishi mumkin.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { uz } from "@/lib/i18n/uz";
import { ServiceError } from "../errors";
import { validateInitData } from "./miniapp";

const TOKEN = "7000000001:TEST-test-test-test";
let saved: string | undefined;

function hmac(key: crypto.BinaryLike, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

/** Telegram rasmiy algoritmi bo'yicha to'g'ri imzolangan initData. */
function signedInitData(params: Record<string, string>, token = TOKEN) {
  const search = new URLSearchParams(params);
  search.delete("hash");
  const dcs = [...search.entries()].sort().map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = hmac("WebAppData", token);
  search.set("hash", hmac(secret, dcs).toString("hex"));
  return search.toString();
}

const user = JSON.stringify({ id: 700000001, first_name: "Kassir", username: "kassir1" });

beforeAll(() => {
  saved = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = TOKEN;
});

afterAll(() => {
  if (saved === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = saved;
});

describe("validateInitData", () => {
  it("to'g'ri imzo — foydalanuvchi qaytadi", () => {
    const now = new Date();
    const raw = signedInitData({
      auth_date: String(Math.floor(now.getTime() / 1000) - 60),
      query_id: "AAF1",
      user,
    });
    expect(validateInitData(raw, now).id).toBe(700000001);
  });

  it("yangi 'signature' maydoni bilan imzolangan — qabul qilinadi", () => {
    const now = new Date();
    const raw = signedInitData({
      auth_date: String(Math.floor(now.getTime() / 1000)),
      query_id: "AAF1",
      signature: "MEUCIQDexample-signature",
      user,
    });
    expect(validateInitData(raw, now).id).toBe(700000001);
  });

  it("boshqa token bilan imzolangan — invalidInitData", () => {
    const now = new Date();
    const raw = signedInitData(
      { auth_date: String(Math.floor(now.getTime() / 1000)), query_id: "AAF1", user },
      "7000000002:OTHER",
    );
    expect(() => validateInitData(raw, now)).toThrowError(uz.miniapp.invalidInitData);
  });

  it("imzolanganidan keyin user maydoni o'zgartirilgan — invalidInitData", () => {
    const now = new Date();
    const raw = signedInitData({
      auth_date: String(Math.floor(now.getTime() / 1000)),
      query_id: "AAF1",
      user: JSON.stringify({ id: 1, first_name: "oddiy" }),
    });
    const tampered = new URLSearchParams(raw);
    tampered.set("user", JSON.stringify({ id: 2, first_name: "admin" }));
    expect(() => validateInitData(tampered.toString(), now)).toThrowError(
      uz.miniapp.invalidInitData,
    );
  });

  it("auth_date 24 soatdan eski — expiredInitData", () => {
    const now = new Date();
    const raw = signedInitData({
      auth_date: String(Math.floor(now.getTime() / 1000) - 25 * 3600),
      query_id: "AAF1",
      user,
    });
    expect(() => validateInitData(raw, now)).toThrowError(uz.miniapp.expiredInitData);
  });

  it("hash yo'q yoki user buzilgan — invalidInitData", () => {
    const now = new Date();
    expect(() =>
      validateInitData(new URLSearchParams({ auth_date: String(Math.floor(now.getTime() / 1000)), user }).toString(), now),
    ).toThrowError(uz.miniapp.invalidInitData);
    const raw = signedInitData({ auth_date: String(Math.floor(now.getTime() / 1000)), user: "{" });
    expect(() => validateInitData(raw, now)).toThrowError(uz.miniapp.invalidInitData);
  });

  it("bot tokeni sozlanmagan — botNotConfigured", () => {
    const saved2 = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    try {
      expect(() => validateInitData("hash=ab")).toThrowError(uz.miniapp.botNotConfigured);
    } finally {
      process.env.TELEGRAM_BOT_TOKEN = saved2;
    }
  });

  it("xato turi ServiceError", () => {
    try {
      validateInitData("hash=ab");
      expect.unreachable("xato bo'lishi kerak edi");
    } catch (e) {
      expect(e).toBeInstanceOf(ServiceError);
    }
  });
});
