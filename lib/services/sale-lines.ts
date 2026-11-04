import type { Prisma } from "@prisma/client";
import type Decimal from "decimal.js";
import { uz } from "@/lib/i18n/uz";
import type { UnitValue } from "@/lib/validation/product";
import { ServiceError } from "./errors";
import { activePromoPercents } from "./promotions";
import { lineTotal, parseQuantity, promoPrice } from "./sale-math";

export type BuiltLine = {
  productId: string;
  name: string;
  unit: UnitValue;
  quantity: Decimal;
  price: number;
  total: number;
};

/**
 * Kassadan kelgan (productId, miqdor) juftliklarini to'liq qatorlarga aylantiradi.
 * Narx bazadan olinadi; `priceOverrides` — smetadan sotishda smeta narxi.
 * Mahsulot shu do'konniki va faol bo'lishi shart.
 */
export async function buildLines(
  tx: Prisma.TransactionClient,
  tenantId: string,
  items: { productId: string; quantity: string }[],
  priceOverrides: Map<string, number> = new Map(),
): Promise<BuiltLine[]> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await tx.product.findMany({
    where: { tenantId, id: { in: ids }, isActive: true },
    select: { id: true, name: true, unit: true, salePrice: true, categoryId: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  // Amaldagi aksiyalar (smeta narxi berilgan mahsulotga ta'sir qilmaydi — smetada qotgan)
  const promos = await activePromoPercents(tenantId, products, new Date(), tx);

  return items.map((item, index) => {
    const product = byId.get(item.productId);
    if (!product) throw new ServiceError(uz.pos.productUnavailable, `items.${index}`);

    const quantity = parseQuantity(item.quantity, product.unit);
    if (!quantity.ok) throw new ServiceError(quantity.error, `items.${index}`);

    const promo = promos.get(product.id);
    const price =
      priceOverrides.get(product.id) ??
      (promo ? promoPrice(product.salePrice, promo) : product.salePrice);
    return {
      productId: product.id,
      name: product.name,
      unit: product.unit,
      quantity: quantity.value,
      price,
      total: lineTotal(price, quantity.value),
    };
  });
}
