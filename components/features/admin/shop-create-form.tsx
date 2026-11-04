"use client";

import { useActionState } from "react";
import { createShopAction, type ShopActionState } from "@/app/admin/actions";
import { PasswordReveal } from "@/components/features/staff/password-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";

const fields = [
  { name: "shopName", label: uz.admin.shopName },
  { name: "address", label: uz.admin.address },
  { name: "shopPhone", label: uz.admin.shopPhone },
  { name: "ownerName", label: uz.admin.ownerName },
  { name: "ownerPhone", label: uz.admin.ownerPhone, type: "tel" },
] as const;

export function ShopCreateForm() {
  const [state, action, pending] = useActionState<ShopActionState, FormData>(createShopAction, {});
  const e = state.fieldErrors ?? {};
  const v = state.ok ? {} : (state.values ?? {});

  return (
    <div className="flex flex-col gap-4">
      <form
        action={action}
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card"
        noValidate
      >
        <h2 className="font-bold">{uz.admin.createShop}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`shop-${f.name}`}>{f.label}</Label>
              <Input
                id={`shop-${f.name}`}
                name={f.name}
                type={"type" in f ? f.type : "text"}
                defaultValue={v[f.name]}
                aria-invalid={!!e[f.name]}
              />
              {e[f.name] && <p className="text-xs text-destructive">{e[f.name]}</p>}
            </div>
          ))}
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {uz.admin.create}
          </Button>
        </div>
      </form>
      {state.created && (
        <PasswordReveal
          title={`${uz.admin.created} ${state.created.shop} — ${state.created.ownerName}`}
          login={state.created.phone}
          password={state.created.password}
        />
      )}
    </div>
  );
}
