import { describe, expect, it } from "vitest";
import { catalogQuerySchema, shopActionSchema } from "./miniapp";

const id = "clx1a2b3c4d5e6f7g8h9i0j";

describe("Mini App so'rovlari", () => {
  it("savatcha o'zgarishi: +1 / −1 qabul qilinadi, 0 va bo'sh ID rad etiladi", () => {
    expect(
      shopActionSchema.parse({ op: "change", customerId: id, productId: id, delta: 1 }),
    ).toMatchObject({ op: "change", delta: 1 });
    expect(() =>
      shopActionSchema.parse({ op: "change", customerId: id, productId: id, delta: 0 }),
    ).toThrow();
    expect(() =>
      shopActionSchema.parse({ op: "change", customerId: "", productId: id, delta: 1 }),
    ).toThrow();
  });

  it("noma'lum amal rad etiladi", () => {
    expect(() => shopActionSchema.parse({ op: "delete", customerId: id })).toThrow();
    expect(shopActionSchema.parse({ op: "submit", customerId: id })).toEqual({
      op: "submit",
      customerId: id,
    });
  });

  it("katalog sahifasi son bo'lishi va manfiy bo'lmasligi kerak", () => {
    expect(catalogQuerySchema.parse({ customerId: id, page: "2" }).page).toBe(2);
    expect(catalogQuerySchema.parse({ customerId: id, page: null }).page).toBe(0);
    expect(() => catalogQuerySchema.parse({ customerId: id, page: "-1" })).toThrow();
  });
});
