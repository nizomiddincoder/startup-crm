"use client";

import Decimal from "decimal.js";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  createStockDocumentAction,
  loadCategoryForCountAction,
  searchStockProductsAction,
  type StockDocKind,
} from "@/app/(dashboard)/dashboard/warehouse/actions";
import { ProductSearch, type SearchProduct } from "@/components/features/pos/product-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatAmount } from "@/lib/services/money";
import { parseQuantity } from "@/lib/services/sale-math";

type Line = {
  productId: string;
  name: string;
  unit: SearchProduct["unit"];
  stock: string;
  quantity: string;
  costPrice: string;
};

type Props = {
  kind: StockDocKind;
  categories: { id: string; name: string }[];
};

export function StockDocumentForm({ kind, categories }: Props) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [result, setResult] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string>();

  const isReceipt = kind === "receipt";
  const isInventory = kind === "inventory";

  function toLine(p: SearchProduct): Line {
    return {
      productId: p.id,
      name: p.name,
      unit: p.unit,
      stock: p.stock,
      // Inventarizatsiyada sanalgan miqdor bo'sh boshlanadi — xodim o'zi sanab yozadi
      quantity: isInventory ? "" : "1",
      costPrice: isReceipt && p.costPrice !== null ? formatAmount(p.costPrice) : "",
    };
  }

  function addProduct(p: SearchProduct) {
    setNotice(undefined);
    if (lines.some((l) => l.productId === p.id)) {
      setNotice(uz.warehouse.duplicateLine);
      return;
    }
    setLines((ls) => [...ls, toLine(p)]);
  }

  function update(productId: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function loadCategory() {
    if (!categoryId) return;
    startTransition(async () => {
      const products = await loadCategoryForCountAction(categoryId);
      setLines((ls) => {
        const existing = new Set(ls.map((l) => l.productId));
        return [...ls, ...products.filter((p) => !existing.has(p.id)).map(toLine)];
      });
    });
  }

  const checked = lines.map((l) => {
    const q = parseQuantity(l.quantity, l.unit, { allowZero: isInventory });
    const difference = isInventory && q.ok ? q.value.minus(new Decimal(l.stock)) : null;
    return {
      ...l,
      error: l.quantity.trim() === "" ? null : q.ok ? null : q.error,
      ok: q.ok,
      difference,
    };
  });
  const ready =
    checked.length > 0 && checked.every((l) => l.ok) && (kind !== "write-off" || note.trim());

  const serverLineErrors = new Map(
    Object.entries(result.fieldErrors ?? {})
      .filter(([k]) => k.startsWith("items."))
      .map(([k, v]) => [Number(k.split(".")[1]), v]),
  );
  const generalError =
    result.error ??
    (serverLineErrors.size ? undefined : Object.values(result.fieldErrors ?? {})[0]);

  function save() {
    startTransition(async () => {
      const res = await createStockDocumentAction(kind, {
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          costPrice: isReceipt ? l.costPrice : undefined,
        })),
        supplierName: isReceipt ? supplierName : undefined,
        note,
      });
      setResult(res);
      if (res.ok && res.id) router.push(`/dashboard/warehouse/documents/${res.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        {isReceipt && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier">{uz.warehouse.supplier}</Label>
            <Input
              id="supplier"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder={uz.warehouse.supplierPlaceholder}
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note">
            {kind === "write-off" ? uz.warehouse.reason : uz.warehouse.note}
          </Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={kind === "write-off" ? uz.warehouse.reasonPlaceholder : undefined}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <ProductSearch
          ref={searchRef}
          onPick={addProduct}
          searchAction={searchStockProductsAction}
          placeholder={uz.warehouse.addProducts}
        />
        {notice && <p className="text-sm text-destructive">{notice}</p>}
        {isInventory && (
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-label={uz.products.category}
            >
              <NativeSelectOption value="">{uz.products.allCategories}</NativeSelectOption>
              {categories.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button variant="outline" onClick={loadCategory} disabled={!categoryId || pending}>
              {uz.warehouse.loadCategory}
            </Button>
          </div>
        )}
        {isReceipt && (
          <p className="text-xs text-muted-foreground">{uz.warehouse.costUpdatesHint}</p>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {uz.warehouse.noLines}
        </p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.pos.product}</TableHead>
                <TableHead className="text-right">
                  {isInventory ? uz.warehouse.expected : uz.warehouse.stock}
                </TableHead>
                <TableHead className="w-44">
                  {isInventory ? uz.warehouse.counted : uz.pos.quantity}
                </TableHead>
                {isReceipt && <TableHead className="w-44">{uz.warehouse.costPerUnit}</TableHead>}
                {isInventory && (
                  <TableHead className="text-right">{uz.warehouse.difference}</TableHead>
                )}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {checked.map((l, index) => {
                const error = l.error ?? serverLineErrors.get(index);
                return (
                  <TableRow key={l.productId} data-testid="doc-line">
                    <TableCell className="font-medium whitespace-normal">{l.name}</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatQuantity(l.stock)} {uz.units[l.unit]}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={l.quantity}
                          onChange={(e) => update(l.productId, { quantity: e.target.value })}
                          onFocus={(e) => e.target.select()}
                          inputMode="decimal"
                          aria-label={`${isInventory ? uz.warehouse.counted : uz.pos.quantity}: ${l.name}`}
                          aria-invalid={!!error}
                          className="w-24 text-right tabular-nums"
                        />
                        <span className="text-sm text-muted-foreground">{uz.units[l.unit]}</span>
                      </div>
                      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                    </TableCell>
                    {isReceipt && (
                      <TableCell>
                        <Input
                          value={l.costPrice}
                          onChange={(e) => update(l.productId, { costPrice: e.target.value })}
                          inputMode="numeric"
                          aria-label={`${uz.warehouse.costPerUnit}: ${l.name}`}
                          className="w-32 text-right tabular-nums"
                        />
                      </TableCell>
                    )}
                    {isInventory && (
                      <TableCell
                        className={
                          l.difference && !l.difference.isZero()
                            ? "text-right font-medium text-destructive tabular-nums"
                            : "text-right text-muted-foreground tabular-nums"
                        }
                      >
                        {l.difference
                          ? `${l.difference.gt(0) ? "+" : ""}${formatQuantity(l.difference.toString())}`
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${uz.pos.remove}: ${l.name}`}
                        onClick={() =>
                          setLines((ls) => ls.filter((x) => x.productId !== l.productId))
                        }
                      >
                        <X />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {generalError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {generalError}
        </p>
      )}

      <div>
        <Button size="lg" onClick={save} disabled={!ready || pending}>
          {pending ? uz.pos.saving : uz.warehouse.save}
        </Button>
      </div>
    </div>
  );
}
