import { describe, expect, it } from "vitest";
import { createLimiter } from "./rate-limit";

describe("login cheklovi", () => {
  it("5 ta xatodan keyin bloklaydi va 15 daqiqadan so'ng ochadi", () => {
    const l = createLimiter(5, 15 * 60_000);
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) l.fail("+998901111111", t0);
    expect(l.check("+998901111111", t0).blocked).toBe(false);
    l.fail("+998901111111", t0);
    expect(l.check("+998901111111", t0)).toEqual({ blocked: true, minutes: 15 });
    expect(l.check("+998902222222", t0).blocked).toBe(false);
    expect(l.check("+998901111111", t0 + 15 * 60_000 + 1).blocked).toBe(false);
  });

  it("muvaffaqiyatli kirishdan keyin hisob tozalanadi", () => {
    const l = createLimiter(2, 60_000);
    l.fail("a");
    l.reset("a");
    l.fail("a");
    expect(l.check("a").blocked).toBe(false);
  });
});
