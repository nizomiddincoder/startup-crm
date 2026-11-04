"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";
import { UNITS } from "@/lib/validation/product";

export type ProductFormDefaults = {
  name: string;
  categoryId: string;
  unit: string;
  salePrice: string;
  costPrice: string;
  barcode: string;
  minStock: string;
};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: { id: string; name: string }[];
  defaults?: ProductFormDefaults;
};

const empty: ProductFormDefaults = {
  name: "",
  categoryId: "",
  unit: "PIECE",
  salePrice: "",
  costPrice: "",
  barcode: "",
  minStock: "",
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function ProductForm({ action, categories, defaults = empty }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  // Xato bo'lsa, foydalanuvchi yozgan qiymatlar saqlanib qoladi
  const v = { ...defaults, ...state.values };
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{uz.products.name}</Label>
        <Input
          id="name"
          name="name"
          defaultValue={v.name}
          placeholder={uz.products.namePlaceholder}
          aria-invalid={!!e.name}
          autoFocus
        />
        <FieldError message={e.name} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoryId">{uz.products.category}</Label>
          <NativeSelect
            id="categoryId"
            name="categoryId"
            defaultValue={v.categoryId}
            aria-invalid={!!e.categoryId}
            className="w-full"
          >
            <NativeSelectOption value="">{uz.categories.none}</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError message={e.categoryId} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">{uz.products.unit}</Label>
          <NativeSelect
            id="unit"
            name="unit"
            defaultValue={v.unit}
            aria-invalid={!!e.unit}
            className="w-full"
          >
            {UNITS.map((u) => (
              <NativeSelectOption key={u} value={u}>
                {uz.units[u]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError message={e.unit} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="salePrice">
            {uz.products.salePrice} ({uz.common.currency})
          </Label>
          <Input
            id="salePrice"
            name="salePrice"
            inputMode="numeric"
            defaultValue={v.salePrice}
            placeholder="125 000"
            aria-invalid={!!e.salePrice}
          />
          <FieldError message={e.salePrice} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="costPrice">
            {uz.products.costPrice} ({uz.common.currency})
          </Label>
          <Input
            id="costPrice"
            name="costPrice"
            inputMode="numeric"
            defaultValue={v.costPrice}
            aria-invalid={!!e.costPrice}
          />
          <p className="text-xs text-muted-foreground">{uz.products.costPriceHint}</p>
          <FieldError message={e.costPrice} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="barcode">{uz.products.barcode}</Label>
        <Input
          id="barcode"
          name="barcode"
          defaultValue={v.barcode}
          aria-invalid={!!e.barcode}
          autoComplete="off"
          // Skaner kod oxirida Enter bosadi — forma vaqtidan oldin yuborilmasin
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
        <p className="text-xs text-muted-foreground">{uz.products.barcodeHint}</p>
        <FieldError message={e.barcode} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="minStock">{uz.warehouse.minStock}</Label>
        <Input
          id="minStock"
          name="minStock"
          inputMode="decimal"
          defaultValue={v.minStock}
          aria-invalid={!!e.minStock}
          className="max-w-40"
        />
        <p className="text-xs text-muted-foreground">{uz.warehouse.minStockHint}</p>
        <FieldError message={e.minStock} />
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {uz.common.save}
        </Button>
        <Link
          href="/dashboard/products"
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          {uz.common.cancel}
        </Link>
      </div>
    </form>
  );
}
