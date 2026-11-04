/**
 * Mahsulot rasmlari: yuklash, AI yaratish/chiroyli qilish (soxta Gemini), limit, tenant.
 * Avval: npm run db:local
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import {
  aiAvailability,
  generateProductImage,
  getProductImage,
  removeProductImages,
  standardizeProductImage,
  uploadProductImage,
} from "./product-images";
import { createProduct } from "./products";

const shopA = `test-img-a-${randomUUID()}`;
const shopB = `test-img-b-${randomUUID()}`;
let cement: string;
let paint: string;

const png = (w: number, h: number, color = "#c0392b") =>
  sharp({ create: { width: w, height: h, channels: 3, background: color } })
    .png()
    .toBuffer();

/** Soxta Gemini: so'ralgan prompt'ni yozib oladi va kichik PNG qaytaradi. */
function fakeAi() {
  const prompts: string[] = [];
  const withImage: boolean[] = [];
  return {
    prompts,
    withImage,
    ai: async (prompt: string, image?: { data: Buffer; mime: string }) => {
      prompts.push(prompt);
      withImage.push(!!image);
      return { data: await png(300, 200, "#2980b9"), mime: "image/png" };
    },
  };
}

beforeAll(async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_DAILY_LIMIT", "3");
  await db.tenant.createMany({
    data: [
      { id: shopA, name: "A" },
      { id: shopB, name: "B" },
    ],
  });
  cement = (
    await createProduct(shopA, { name: "Sement M400, 50 kg", unit: "BAG", salePrice: 62000 })
  ).id;
  paint = (
    await createProduct(shopA, { name: "Emulsiya oq, 10 l", unit: "PIECE", salePrice: 165000 })
  ).id;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await db.tenant.deleteMany({ where: { id: { in: [shopA, shopB] } } });
  await db.$disconnect();
});

describe("rasm yuklash", () => {
  it("asl rasm siqiladi, kassa uchun oq fonli 512×512 kvadrat, versiya oshadi", async () => {
    const bytes = await png(1600, 900);
    await uploadProductImage(shopA, cement, { bytes, size: bytes.length, type: "image/png" });
    const original = await getProductImage(shopA, cement, "ORIGINAL");
    const standard = await getProductImage(shopA, cement, "STANDARD");
    expect(original?.mime).toBe("image/webp");
    const meta = await sharp(Buffer.from(standard!.data)).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 512, height: 512 });
    expect((await sharp(Buffer.from(original!.data)).metadata()).width).toBe(1280);
    expect((await db.product.findUniqueOrThrow({ where: { id: cement } })).imageVersion).toBe(1);
  });

  it("noto'g'ri tur va juda katta fayl rad etiladi; boshqa do'kon rasmni ko'rmaydi", async () => {
    await expect(
      uploadProductImage(shopA, cement, { bytes: Buffer.from("x"), size: 1, type: "text/plain" }),
    ).rejects.toThrow(uz.images.badType);
    await expect(
      uploadProductImage(shopA, cement, {
        bytes: Buffer.alloc(10),
        size: 7 * 1024 * 1024,
        type: "image/png",
      }),
    ).rejects.toThrow(uz.images.tooLarge);
    expect(await getProductImage(shopB, cement, "STANDARD")).toBeNull();
    await expect(
      uploadProductImage(shopB, cement, { bytes: await png(10, 10), size: 100, type: "image/png" }),
    ).rejects.toThrow(uz.products.notFound);
  });
});

describe("AI (Gemini)", () => {
  it("yuklangan rasmni chiroyli qiladi — asl rasm bilan so'raladi, asli saqlanadi", async () => {
    const fake = fakeAi();
    await standardizeProductImage(shopA, cement, { ai: fake.ai });
    expect(fake.withImage).toEqual([true]);
    expect(fake.prompts[0]).toContain("Sement M400");
    expect((await getProductImage(shopA, cement, "STANDARD"))?.source).toBe("AI_STANDARDIZED");
    expect((await getProductImage(shopA, cement, "ORIGINAL"))?.source).toBe("UPLOAD");
  });

  it("rasmsiz mahsulotga nomidan yaratadi; asl rasm bo'lmasa chiroyli qilib bo'lmaydi", async () => {
    await expect(standardizeProductImage(shopA, paint, { ai: fakeAi().ai })).rejects.toThrow(
      uz.images.noOriginal,
    );
    const fake = fakeAi();
    await generateProductImage(shopA, paint, { ai: fake.ai });
    expect(fake.withImage).toEqual([false]);
    expect(fake.prompts[0]).toContain("Emulsiya oq, 10 l");
    expect((await getProductImage(shopA, paint, "STANDARD"))?.source).toBe("AI_GENERATED");
  });

  it("kunlik limit va AI xatosi (xato ham hisobga yoziladi)", async () => {
    expect(await aiAvailability(shopA)).toEqual({ enabled: true, left: 1 });
    await expect(
      generateProductImage(shopA, paint, {
        ai: async () => {
          throw new Error("503");
        },
      }),
    ).rejects.toThrow(uz.images.aiFailed);
    expect(await db.aiGeneration.count({ where: { tenantId: shopA, ok: false } })).toBe(1);
    await expect(generateProductImage(shopA, paint, { ai: fakeAi().ai })).rejects.toThrow(
      uz.images.aiLimit,
    );
    // Boshqa do'konning limiti alohida
    expect(await aiAvailability(shopB)).toEqual({ enabled: true, left: 3 });
  });

  it("kalit bo'lmasa — AI o'chiq", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await aiAvailability(shopA)).toEqual({ enabled: false, left: 0 });
    await expect(generateProductImage(shopB, paint)).rejects.toThrow();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  it("rasmni o'chirish — versiya 0", async () => {
    await removeProductImages(shopA, cement);
    expect(await getProductImage(shopA, cement, "STANDARD")).toBeNull();
    expect((await db.product.findUniqueOrThrow({ where: { id: cement } })).imageVersion).toBe(0);
  });
});
