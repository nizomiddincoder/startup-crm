"use client";

import { useActionState, useState } from "react";
import {
  createPromotionAction,
  saveCashbackAction,
} from "@/app/(dashboard)/dashboard/marketing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

/** Keshbek foizi: mijoz har xariddan shuncha foiz ball oladi. */
export function CashbackForm({ value }: { value: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCashbackAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cashbackPercent">{uz.promotions.cashbackPercent}</Label>
        <Input
          id="cashbackPercent"
          name="cashbackPercent"
          inputMode="decimal"
          defaultValue={state.values?.cashbackPercent ?? value?.replace(".", ",") ?? ""}
          placeholder="2"
          className="w-32"
          aria-invalid={!!state.fieldErrors?.cashbackPercent}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {uz.common.save}
      </Button>
      {state.ok && <span className="text-sm text-success">{state.message}</span>}
      <FieldError message={state.fieldErrors?.cashbackPercent} />
    </form>
  );
}

type Option = { id: string; name: string };

/** Yangi aksiya: mahsulotga yoki kategoriyaga, sanalar oralig'ida. */
export function PromotionForm({
  products,
  categories,
  today,
}: {
  products: Option[];
  categories: Option[];
  today: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPromotionAction, {});
  const [target, setTarget] = useState(state.values?.target ?? "category");
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <form
      action={action}
      key={state.ok ? "saved" : "form"}
      className="grid gap-4 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3"
      data-testid="promo-form"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-name">{uz.promotions.name}</Label>
        <Input
          id="promo-name"
          name="name"
          defaultValue={v.name}
          placeholder={uz.promotions.namePlaceholder}
        />
        <FieldError message={e.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-percent">{uz.promotions.percent}</Label>
        <Input id="promo-percent" name="percent" inputMode="decimal" defaultValue={v.percent} />
        <FieldError message={e.percent} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-target">{uz.promotions.target}</Label>
        <select
          id="promo-target"
          name="target"
          value={target}
          onChange={(ev) => setTarget(ev.target.value)}
          className={selectClass}
        >
          <option value="category">{uz.promotions.targetCategory}</option>
          <option value="product">{uz.promotions.targetProduct}</option>
        </select>
      </div>
      {target === "product" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="promo-product">{uz.promotions.product}</Label>
          <select
            id="promo-product"
            name="productId"
            defaultValue={v.productId ?? ""}
            className={selectClass}
          >
            <option value="">—</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <FieldError message={e.productId} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="promo-category">{uz.promotions.category}</Label>
          <select
            id="promo-category"
            name="categoryId"
            defaultValue={v.categoryId ?? ""}
            className={selectClass}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError message={e.categoryId} />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-start">{uz.promotions.startsOn}</Label>
        <Input id="promo-start" name="startsOn" type="date" defaultValue={v.startsOn ?? today} />
        <FieldError message={e.startsOn} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-end">{uz.promotions.endsOn}</Label>
        <Input id="promo-end" name="endsOn" type="date" defaultValue={v.endsOn ?? today} />
        <FieldError message={e.endsOn} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>
          {uz.promotions.add}
        </Button>
        {state.ok && <span className="text-sm text-success">{state.message}</span>}
        {state.error && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
