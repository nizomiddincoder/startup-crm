"use client";

import { Search } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { searchProductsAction } from "@/app/pos/actions";
import { Input } from "@/components/ui/input";
import { uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import type { UnitValue } from "@/lib/validation/product";

export type SearchProduct = {
  id: string;
  name: string;
  unit: UnitValue;
  salePrice: number;
  costPrice: number | null;
  barcode: string | null;
  /** Joriy ombor qoldig'i (Decimal satr ko'rinishida) */
  stock: string;
  /** 0 — rasm yo'q */
  imageVersion?: number;
  /** Aksiya bo'lsa: `salePrice` — aksiya narxi, `basePrice` — oddiy narx */
  basePrice?: number | null;
  promoPercent?: number | null;
};

type Props = {
  onPick: (product: SearchProduct) => void;
  /** Kassa — sukut bo'yicha. Ombor sahifalari o'z action'ini beradi (omborchi kassaga kira olmaydi). */
  searchAction?: (query: string) => Promise<SearchProduct[]>;
  placeholder?: string;
};

/**
 * Qidiruv maydoni. Skaner shtrix-kodni yozib Enter bosadi:
 * aniq shtrix-kod topilsa — mahsulot darhol qo'shiladi.
 * Nom yozilsa — ro'yxat chiqadi, Enter birinchisini qo'shadi.
 */
export const ProductSearch = forwardRef<HTMLInputElement, Props>(function ProductSearch(
  { onPick, searchAction = searchProductsAction, placeholder = uz.pos.searchPlaceholder },
  ref,
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [message, setMessage] = useState<string>();
  const requestId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const actionRef = useRef(searchAction);
  actionRef.current = searchAction;

  async function search(q: string) {
    const id = ++requestId.current;
    const found = await actionRef.current(q);
    if (id !== requestId.current) return null; // eskirgan javob
    return found;
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      const found = await search(q);
      if (!found) return;
      setResults(found);
      setMessage(found.length === 0 ? uz.pos.noResults : undefined);
    }, 250);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  function pick(product: SearchProduct) {
    onPick(product);
    setQuery("");
    setResults([]);
    setMessage(undefined);
  }

  async function handleEnter() {
    const q = query.trim();
    if (!q) return;
    // Skaner kodni tez yozib darhol Enter bosadi — kechiktirilgan qidiruv Enter natijasini
    // "eskirgan" deb bekor qilmasligi uchun uni to'xtatamiz
    clearTimeout(debounceTimer.current);
    const found = await search(q);
    if (!found) return;
    const exact = found.find((p) => p.barcode === q);
    if (exact) return pick(exact);
    if (found.length > 0) return pick(found[0]);
    setResults([]);
    setMessage(/^\d{4,}$/.test(q) ? uz.pos.barcodeNotFound : uz.pos.noResults);
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-3.5 left-4 size-4 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={ref}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setMessage(undefined);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleEnter();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoFocus
        className="h-11 rounded-xl pl-10 text-base shadow-card"
      />
      {message && <p className="mt-1 text-sm text-destructive">{message}</p>}
      {results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border bg-popover shadow-lg"
        >
          {results.map((p) => {
            const outOfStock = Number(p.stock) <= 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => pick(p)}
                  className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left hover:bg-accent"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    {p.barcode && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {p.barcode}
                      </span>
                    )}
                    <span
                      className={
                        outOfStock
                          ? "block text-xs text-destructive"
                          : "block text-xs text-muted-foreground"
                      }
                    >
                      {uz.warehouse.inStock}: {formatQuantity(p.stock)} {uz.units[p.unit]}
                    </span>
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {formatSum(p.salePrice)}
                    <span className="text-muted-foreground">
                      {" "}
                      {uz.pos.perUnit} {uz.units[p.unit]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
