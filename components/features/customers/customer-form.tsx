"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";

export type CustomerFormDefaults = {
  name: string;
  phone: string;
  note: string;
  creditLimit: string;
  discountPercent: string;
  isMaster: boolean;
  bonusPercent: string;
};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: CustomerFormDefaults;
  /** Egasi/menejer: usta, bonus foizi va nasiya limiti maydonlari */
  canManage: boolean;
};

const empty: CustomerFormDefaults = {
  name: "",
  phone: "",
  note: "",
  creditLimit: "",
  discountPercent: "",
  isMaster: false,
  bonusPercent: "",
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function CustomerForm({ action, defaults = empty, canManage }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const v = { ...defaults, ...state.values };
  const e = state.fieldErrors ?? {};
  const [isMaster, setIsMaster] = useState(
    state.values ? state.values.isMaster === "on" : defaults.isMaster,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{uz.customers.name}</Label>
        <Input
          id="name"
          name="name"
          defaultValue={v.name}
          placeholder={uz.customers.namePlaceholder}
          aria-invalid={!!e.name}
        />
        <FieldError message={e.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{uz.customers.phone}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={v.phone}
          placeholder={uz.auth.phonePlaceholder}
          aria-invalid={!!e.phone}
        />
        <FieldError message={e.phone} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note">{uz.customers.note}</Label>
        <Input id="note" name="note" defaultValue={v.note} />
      </div>

      {canManage ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="creditLimit">{uz.customers.creditLimit}</Label>
            <Input
              id="creditLimit"
              name="creditLimit"
              inputMode="numeric"
              defaultValue={v.creditLimit}
              aria-invalid={!!e.creditLimit}
              className="max-w-48"
            />
            <p className="text-xs text-muted-foreground">{uz.customers.creditLimitHint}</p>
            <FieldError message={e.creditLimit} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="discountPercent">{uz.customers.discountPercent}</Label>
            <Input
              id="discountPercent"
              name="discountPercent"
              inputMode="decimal"
              defaultValue={v.discountPercent}
              aria-invalid={!!e.discountPercent}
              className="max-w-32"
            />
            <p className="text-xs text-muted-foreground">{uz.customers.discountPercentHint}</p>
            <FieldError message={e.discountPercent} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isMaster"
              checked={isMaster}
              onChange={(ev) => setIsMaster(ev.target.checked)}
              className="size-4 accent-primary"
            />
            {uz.customers.isMaster}
          </label>
          {isMaster && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="bonusPercent">{uz.customers.bonusPercent}</Label>
              <Input
                id="bonusPercent"
                name="bonusPercent"
                inputMode="decimal"
                defaultValue={v.bonusPercent}
                aria-invalid={!!e.bonusPercent}
                className="max-w-32"
              />
              <p className="text-xs text-muted-foreground">{uz.customers.bonusPercentHint}</p>
              <FieldError message={e.bonusPercent} />
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{uz.customers.readOnlyFields}</p>
      )}

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-success">{uz.products.saved}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {uz.common.save}
        </Button>
      </div>
    </form>
  );
}
