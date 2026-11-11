/**
 * Mahsulot rasmlari: yuklash, Gemini bilan yaratish va bir xil uslubga keltirish.
 * Kassa har doim STANDARD rasmni ko'rsatadi (oq fon, kvadrat); ORIGINAL — egasi yuklagani.
 * Har o'zgarishda Product.imageVersion oshadi — rasm manzili (?v=) yangilanib, kesh eskirmaydi.
 */
import type { ImageSource, Unit } from "@prisma/client";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { ServiceError } from "./errors";
import { geminiConfig, geminiImage, generatePrompt, standardizePrompt } from "./images/gemini";
import { assertUpload, normalizeOriginal, toStandardSquare } from "./images/process";
import { hasModule } from "./modules";
import { tashkentDayRange } from "./sales";

const UNIT_EN: Record<Unit, string> = {
  PIECE: "the piece",
  METER: "the meter",
  SQ_METER: "the square meter",
  CUBIC_METER: "the cubic meter",
  KG: "the kilogram",
  TON: "the ton",
  LITER: "the liter",
  BAG: "the bag",
  PACK: "the pack",
  ROLL: "the roll",
  SHEET: "the sheet",
  BOX: "the box",
};

export type ImageDeps = { ai?: typeof geminiImage };

async function product(tenantId: string, productId: string) {
  const p = await db.product.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, name: true, unit: true, category: { select: { name: true } } },
  });
  if (!p) throw new ServiceError(uz.products.notFound);
  return p;
}

async function save(
  tenantId: string,
  productId: string,
  kind: "ORIGINAL" | "STANDARD",
  source: ImageSource,
  data: Buffer,
) {
  const bytes = new Uint8Array(data);
  await db.productImage.upsert({
    where: { productId_kind: { productId, kind } },
    update: { source, data: bytes, mime: "image/webp" },
    create: { tenantId, productId, kind, source, data: bytes, mime: "image/webp" },
  });
}

async function bumpVersion(tenantId: string, productId: string) {
  await db.product.updateMany({
    where: { id: productId, tenantId },
    data: { imageVersion: { increment: 1 } },
  });
}

/** AI yoqilganmi (kalit bor) va bugungi limit tugamaganmi. */
export async function aiAvailability(tenantId: string, now = new Date()) {
  const { apiKey, dailyLimit } = geminiConfig();
  if (!apiKey || !(await hasModule(tenantId, "ai"))) return { enabled: false as const, left: 0 };
  const { from } = tashkentDayRange(now);
  // Faqat rasm so'rovlari (AI yordamchining limiti alohida)
  const used = await db.aiGeneration.count({
    where: { tenantId, kind: { in: ["generate", "standardize"] }, createdAt: { gte: from } },
  });
  return { enabled: true as const, left: Math.max(dailyLimit - used, 0) };
}

async function runAi(
  tenantId: string,
  productId: string,
  kind: string,
  prompt: string,
  image: { data: Buffer; mime: string } | undefined,
  deps: ImageDeps,
) {
  const availability = await aiAvailability(tenantId);
  if (!availability.enabled) throw new ServiceError(uz.images.aiDisabled);
  if (availability.left <= 0) throw new ServiceError(uz.images.aiLimit);
  try {
    const result = await (deps.ai ?? geminiImage)(prompt, image);
    await db.aiGeneration.create({ data: { tenantId, productId, kind, ok: true } });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.aiGeneration.create({
      data: { tenantId, productId, kind, ok: false, error: message.slice(0, 500) },
    });
    console.warn(`[ai] ${kind}:`, message);
    throw new ServiceError(uz.images.aiFailed);
  }
}

/**
 * Egasi rasm yukladi: asl rasm siqiladi, kassa uchun darhol oq fonli kvadrat tayyorlanadi.
 * Gemini bilan "chiroyli qilish" — alohida (fonda) chaqiriladi.
 */
export async function uploadProductImage(
  tenantId: string,
  productId: string,
  file: { bytes: Buffer; size: number; type: string },
) {
  assertUpload(file);
  await product(tenantId, productId);
  const original = await normalizeOriginal(file.bytes);
  await save(tenantId, productId, "ORIGINAL", "UPLOAD", original);
  await save(tenantId, productId, "STANDARD", "UPLOAD", await toStandardSquare(original));
  await bumpVersion(tenantId, productId);
}

/** Rasm yo'q bo'lsa — nomi, kategoriyasi va birligidan Gemini yaratadi. */
export async function generateProductImage(
  tenantId: string,
  productId: string,
  deps: ImageDeps = {},
) {
  const p = await product(tenantId, productId);
  const result = await runAi(
    tenantId,
    productId,
    "generate",
    generatePrompt({ name: p.name, category: p.category?.name, unit: UNIT_EN[p.unit] }),
    undefined,
    deps,
  );
  await save(tenantId, productId, "STANDARD", "AI_GENERATED", await toStandardSquare(result.data));
  await bumpVersion(tenantId, productId);
}

/** Yuklangan rasmni Gemini bilan bir xil uslubga keltiradi (asl rasm saqlanib qoladi). */
export async function standardizeProductImage(
  tenantId: string,
  productId: string,
  deps: ImageDeps = {},
) {
  const p = await product(tenantId, productId);
  const original = await db.productImage.findUnique({
    where: { productId_kind: { productId, kind: "ORIGINAL" } },
    select: { data: true, mime: true, tenantId: true },
  });
  if (!original || original.tenantId !== tenantId) throw new ServiceError(uz.images.noOriginal);
  const result = await runAi(
    tenantId,
    productId,
    "standardize",
    standardizePrompt({ name: p.name }),
    { data: Buffer.from(original.data), mime: original.mime },
    deps,
  );
  await save(
    tenantId,
    productId,
    "STANDARD",
    "AI_STANDARDIZED",
    await toStandardSquare(result.data),
  );
  await bumpVersion(tenantId, productId);
}

export async function removeProductImages(tenantId: string, productId: string) {
  await product(tenantId, productId);
  await db.productImage.deleteMany({ where: { tenantId, productId } });
  await db.product.updateMany({ where: { id: productId, tenantId }, data: { imageVersion: 0 } });
}

/** Rasm baytlari (sahifa route'i uchun) — faqat shu do'kon mahsuloti. */
export async function getProductImage(
  tenantId: string,
  productId: string,
  kind: "ORIGINAL" | "STANDARD",
) {
  return db.productImage.findFirst({
    where: { tenantId, productId, kind },
    select: { data: true, mime: true, source: true },
  });
}

/** Tahrirlash sahifasi uchun: qaysi rasmlar bor va qayerdan. */
export async function productImageInfo(tenantId: string, productId: string) {
  const rows = await db.productImage.findMany({
    where: { tenantId, productId },
    select: { kind: true, source: true, updatedAt: true },
  });
  return {
    original: rows.find((r) => r.kind === "ORIGINAL") ?? null,
    standard: rows.find((r) => r.kind === "STANDARD") ?? null,
  };
}
