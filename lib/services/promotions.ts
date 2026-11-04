/**
 * Aksiyalar: muddatli chegirma (%) mahsulotga yoki kategoriyaga. Narx serverda hisoblanadi
 * (`buildLines`) — kassadagi ko'rinish ham shu funksiyadan. Mahsulot aksiyasi kategoriyanikidan
 * ustun; bir nechta bo'lsa — eng kattasi.
 */
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { percent } from "@/lib/validation/customer";
import { ServiceError } from "./errors";
import { promoPrice } from "./sale-math";

type Client = Prisma.TransactionClient | typeof db;

/** Aksiya va keshbek ishlashi uchun yoqiq bo'lishi kerak modullar (marketing → mijozlar). */
export const MARKETING_DEPENDS = ["marketing", "customers"];

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, uz.validation.invalidChoice);

export const promotionSchema = z
  .object({
    name: z.string().trim().min(2, uz.validation.required).max(100, uz.validation.tooLong),
    percent: percent.refine((v) => v !== undefined && Number(v) > 0, uz.promotions.percentRequired),
    target: z.enum(["product", "category"]),
    productId: z.string().optional(),
    categoryId: z.string().optional(),
    startsOn: day,
    endsOn: day,
  })
  .superRefine((d, ctx) => {
    if (d.target === "product" && !d.productId) {
      ctx.addIssue({ code: "custom", path: ["productId"], message: uz.promotions.chooseProduct });
    }
    if (d.target === "category" && !d.categoryId) {
      ctx.addIssue({ code: "custom", path: ["categoryId"], message: uz.promotions.chooseCategory });
    }
    if (d.endsOn < d.startsOn) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: uz.promotions.badDates });
    }
  });
export type PromotionInput = z.input<typeof promotionSchema>;

/** Toshkent sanasi bo'yicha: boshlanish kuni 00:00 dan, tugash kuni 23:59:59 gacha. */
function range(startsOn: string, endsOn: string) {
  return {
    startsAt: new Date(`${startsOn}T00:00:00+05:00`),
    endsAt: new Date(`${endsOn}T23:59:59.999+05:00`),
  };
}

export async function createPromotion(tenantId: string, input: PromotionInput) {
  const d = promotionSchema.parse(input);
  if (d.target === "product") {
    const ok = await db.product.count({ where: { id: d.productId, tenantId } });
    if (!ok) throw new ServiceError(uz.products.notFound, "productId");
  } else {
    const ok = await db.category.count({ where: { id: d.categoryId, tenantId } });
    if (!ok) throw new ServiceError(uz.promotions.chooseCategory, "categoryId");
  }
  return db.promotion.create({
    data: {
      tenantId,
      name: d.name,
      percent: d.percent!,
      productId: d.target === "product" ? d.productId : null,
      categoryId: d.target === "category" ? d.categoryId : null,
      ...range(d.startsOn, d.endsOn),
    },
    select: { id: true },
  });
}

export const cashbackSchema = z.object({ cashbackPercent: percent });

/** Keshbek foizi (bo'sh — o'chiq). */
export async function setCashbackPercent(tenantId: string, input: { cashbackPercent?: string }) {
  const { cashbackPercent } = cashbackSchema.parse(input);
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      cashbackPercent: cashbackPercent && Number(cashbackPercent) > 0 ? cashbackPercent : null,
    },
  });
}

export async function getCashbackPercent(tenantId: string) {
  const t = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { cashbackPercent: true },
  });
  return t.cashbackPercent?.toString() ?? null;
}

/** Aksiya formasidagi tanlovlar: faol mahsulotlar va kategoriyalar. */
export async function promotionOptions(tenantId: string) {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 1000,
    }),
    db.category.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { products, categories };
}

/** Ro'yxatdagi holat: amalda / kutilmoqda / tugagan / o'chirilgan. */
export function promotionState(
  p: { isActive: boolean; startsAt: Date; endsAt: Date },
  now = new Date(),
) {
  if (!p.isActive) return "off" as const;
  if (p.endsAt < now) return "ended" as const;
  if (p.startsAt > now) return "scheduled" as const;
  return "active" as const;
}

export async function setPromotionActive(tenantId: string, id: string, isActive: boolean) {
  await db.promotion.updateMany({ where: { id, tenantId }, data: { isActive } });
}

export async function listPromotions(tenantId: string) {
  return db.promotion.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { endsAt: "desc" }],
    include: {
      product: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: 200,
  });
}

/** productId → amaldagi aksiya foizi (bo'lmasa — yo'q). Marketing moduli o'chiq bo'lsa — hech biri. */
export async function activePromoPercents(
  tenantId: string,
  products: { id: string; categoryId: string | null }[],
  now = new Date(),
  client: Client = db,
): Promise<Map<string, Decimal>> {
  const result = new Map<string, Decimal>();
  if (products.length === 0) return result;
  const promos = await client.promotion.findMany({
    where: {
      tenantId,
      tenant: { NOT: { modulesOff: { hasSome: MARKETING_DEPENDS } } },
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: [
        { productId: { in: products.map((p) => p.id) } },
        {
          categoryId: {
            in: [...new Set(products.map((p) => p.categoryId).filter((c) => c !== null))],
          },
        },
      ],
    },
    select: { percent: true, productId: true, categoryId: true },
  });
  for (const p of products) {
    const own = promos.filter((x) => x.productId === p.id);
    const candidates = own.length
      ? own
      : promos.filter((x) => x.categoryId === p.categoryId && p.categoryId);
    if (!candidates.length) continue;
    const best = candidates.reduce(
      (max, x) =>
        new Decimal(x.percent.toString()).gt(max) ? new Decimal(x.percent.toString()) : max,
      new Decimal(0),
    );
    if (best.gt(0)) result.set(p.id, best);
  }
  return result;
}

/** Kassa ro'yxatlari uchun: salePrice — aksiya narxi, basePrice — asl narx (aksiya bo'lsa). */
export async function withPromoPrices<
  T extends { id: string; salePrice: number; categoryId?: string | null },
>(tenantId: string, products: T[], now = new Date()) {
  const percents = await activePromoPercents(
    tenantId,
    products.map((p) => ({ id: p.id, categoryId: p.categoryId ?? null })),
    now,
  );
  return products.map((p) => {
    const pct = percents.get(p.id);
    return pct
      ? {
          ...p,
          salePrice: promoPrice(p.salePrice, pct),
          basePrice: p.salePrice,
          promoPercent: pct.toNumber(),
        }
      : { ...p, basePrice: null as number | null, promoPercent: null as number | null };
  });
}
