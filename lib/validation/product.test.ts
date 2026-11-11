import { describe, expect, it } from "vitest";
import { uz } from "@/lib/i18n/uz";
import { categorySchema, productSchema } from "./product";

const valid = { name: "Sement M400, 50 kg", unit: "BAG", salePrice: "62 000" };

describe("productSchema", () => {
  it("to'g'ri mahsulotni qabul qiladi va narxni songa aylantiradi", () => {
    const result = productSchema.parse({ ...valid, costPrice: "55000", barcode: "4780000000017" });
    expect(result).toMatchObject({ salePrice: 62000, costPrice: 55000, barcode: "4780000000017" });
  });

  it("bo'sh ixtiyoriy maydonlarni undefined qiladi", () => {
    const result = productSchema.parse({ ...valid, categoryId: "", costPrice: "", barcode: "  " });
    expect(result.categoryId).toBeUndefined();
    expect(result.costPrice).toBeUndefined();
    expect(result.barcode).toBeUndefined();
  });

  it("ixtiyoriy maydonlar umuman yuborilmasa ham ishlaydi", () => {
    const result = productSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.costPrice).toBeUndefined();
  });

  it("sotish narxi yuborilmasa 'majburiy' xatosi", () => {
    const result = productSchema.safeParse({ name: "X", unit: "PIECE" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.find((i) => i.path[0] === "salePrice")?.message).toBe(
      uz.validation.required,
    );
  });

  it("sotish narxi majburiy", () => {
    const result = productSchema.safeParse({ ...valid, salePrice: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(uz.validation.required);
  });

  it("kasr va manfiy narxni rad etadi", () => {
    expect(productSchema.safeParse({ ...valid, salePrice: "12.5" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, salePrice: -5 }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, salePrice: 10.5 }).success).toBe(false);
  });

  it("juda katta narxni rad etadi", () => {
    expect(productSchema.safeParse({ ...valid, salePrice: "5 000 000 000" }).success).toBe(false);
  });

  it("noma'lum o'lchov birligini rad etadi", () => {
    expect(productSchema.safeParse({ ...valid, unit: "XYZ" }).success).toBe(false);
  });

  it("noto'g'ri shtrix-kodni rad etadi", () => {
    expect(productSchema.safeParse({ ...valid, barcode: "12" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, barcode: "47 80" }).success).toBe(false);
  });

  it("minimal qoldiqni qabul qiladi va kasrni nuqtaga aylantiradi", () => {
    expect(productSchema.parse({ ...valid, minStock: "2,5" }).minStock).toBe("2.5");
    expect(productSchema.parse({ ...valid, minStock: "" }).minStock).toBeUndefined();
    expect(productSchema.safeParse({ ...valid, minStock: "-3" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, minStock: "1.2345" }).success).toBe(false);
  });

  it("bo'sh nomni rad etadi", () => {
    expect(productSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("nomni qirqadi", () => {
    expect(categorySchema.parse({ name: "  Bo'yoqlar " }).name).toBe("Bo'yoqlar");
  });
});
