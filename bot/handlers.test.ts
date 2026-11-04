import { Bot } from "grammy";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { botCommands, registerHandlers } from "./handlers";

describe("bot", () => {
  it("buyruqlar tarmoqqa ulanmasdan ro'yxatdan o'tadi", () => {
    const bot = new Bot("123456:TEST", {
      botInfo: {
        id: 1,
        is_bot: true,
        first_name: "Test",
        username: "test_bot",
        can_join_groups: false,
        can_read_all_group_messages: false,
        supports_inline_queries: false,
        can_connect_to_business: false,
        has_main_web_app: false,
      } as never,
    });
    const send = registerHandlers(bot);
    expect(typeof send).toBe("function");
    expect(botCommands.map((c) => c.command)).toEqual([
      "buyurtma",
      "buyurtmalarim",
      "xaridlarim",
      "qarz",
      "hisobot",
      "qarzdorlar",
      "help",
    ]);
  });

  it("buyurtma tugmalari ma'lumoti 64 baytdan oshmaydi", () => {
    const id = "c".repeat(25); // cuid uzunligi
    for (const data of [`o:c:${id}:${id}:12`, `o:a:${id}:${id}:12`, `o:+:${id}:${id}`]) {
      expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
    }
  });
});
