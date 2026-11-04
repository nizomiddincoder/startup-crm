"use client";

import { useState, useTransition } from "react";
import { browseProductsAction } from "@/app/pos/actions";
import { t, uz } from "@/lib/i18n/uz";
import { formatSum } from "@/lib/services/money";
import { cn } from "@/lib/utils";
import type { SearchProduct } from "./product-search";
import { ProductThumb } from "./product-thumb";

/** "Ko'p sotiladigan" — avtomatik kategoriya (lib/services/products.ts → TOP_SELLERS). */
const TOP = "__top";

type Props = {
  categories: { id: string; name: string }[];
  initialProducts: SearchProduct[];
  /** Oxirgi 30 kunda eng ko'p sotilganlar. Bo'sh bo'lsa — bo'lim ko'rsatilmaydi. */
  topProducts: SearchProduct[];
  onPick: (product: SearchProduct) => void;
  disabled?: boolean;
};

/**
 * Kategoriya tugmalari va ixcham mahsulot kartochkalari: faqat rasm, nom va narx —
 * ekranga ko'proq mahsulot sig'adi. Qoldiq savatchada (yetmasa) ko'rsatiladi.
 */
export function ProductGrid({ categories, initialProducts, topProducts, onPick, disabled }: Props) {
  const hasTop = topProducts.length > 0;
  const [categoryId, setCategoryId] = useState(hasTop ? TOP : "");
  const [products, setProducts] = useState(hasTop ? topProducts : initialProducts);
  const [pending, start] = useTransition();

  function selectCategory(id: string) {
    setCategoryId(id);
    start(async () => setProducts(await browseProductsAction(id)));
  }

  const chips = [
    ...(hasTop ? [{ id: TOP, name: uz.pos.topSellers }] : []),
    { id: "", name: uz.pos.allProducts },
    ...categories,
  ];

  return (
    <section className="flex flex-col gap-3">
      <div
        className="scrollbar-none flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label={uz.products.category}
      >
        {chips.map((c) => {
          const active = c.id === categoryId;
          return (
            <button
              key={c.id || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectCategory(c.id)}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-secondary-foreground shadow-card hover:bg-accent",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
          pending && "opacity-60",
        )}
      >
        {products.length === 0 && (
          <p className="col-span-full py-8 text-center text-muted-foreground">
            {uz.products.empty}
          </p>
        )}
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            data-testid="product-card"
            title={p.name}
            className="relative flex flex-col gap-1.5 rounded-xl border bg-card p-2 text-left shadow-card transition hover:border-primary/50 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {p.promoPercent ? (
              <span
                className="absolute top-1 right-1 z-10 rounded-md bg-destructive px-1.5 py-0.5 text-[11px] font-bold text-white"
                data-testid="promo-badge"
              >
                {t(uz.promotions.badge, { percent: p.promoPercent })}
              </span>
            ) : null}
            <ProductThumb product={p} className="h-16 w-full rounded-lg" iconClassName="size-7" />
            <span className="line-clamp-2 min-h-9 text-[13px] leading-[18px] font-semibold">
              {p.name}
            </span>
            {p.promoPercent && p.basePrice ? (
              <span className="truncate text-xs text-muted-foreground tabular-nums line-through">
                {formatSum(p.basePrice)}
              </span>
            ) : null}
            <span className="truncate text-sm font-bold text-primary tabular-nums">
              {formatSum(p.salePrice)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {uz.units[p.unit]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
