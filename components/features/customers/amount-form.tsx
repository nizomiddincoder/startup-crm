"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";

type Props = {
  title: string;
  submitLabel: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  methods: { value: string; label: string }[];
  /** Tavsiya etiladigan summa (masalan, butun qarz yoki butun bonus) */
  suggested?: string;
  testId: string;
};

/** Qarz to'lovini qabul qilish va ustaga bonus berish uchun umumiy forma. */
export function AmountForm({ title, submitLabel, action, methods, suggested, testId }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const e = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card"
      data-testid={testId}
      noValidate
    >
      <h3 className="font-medium">{title}</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${testId}-amount`}>{uz.customers.amount}</Label>
          <Input
            id={`${testId}-amount`}
            name="amount"
            inputMode="numeric"
            defaultValue={state.ok ? "" : (state.values?.amount ?? suggested)}
            aria-invalid={!!e.amount}
            className="w-40 text-right tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${testId}-method`}>{uz.customers.method}</Label>
          <NativeSelect
            id={`${testId}-method`}
            name="method"
            defaultValue={state.values?.method ?? methods[0].value}
          >
            {methods.map((m) => (
              <NativeSelectOption key={m.value} value={m.value}>
                {m.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${testId}-note`}>{uz.customers.note}</Label>
          <Input
            id={`${testId}-note`}
            name="note"
            defaultValue={state.ok ? "" : state.values?.note}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
      {(e.amount || e.method || state.error) && (
        <p className="text-sm text-destructive">{e.amount ?? e.method ?? state.error}</p>
      )}
      {state.ok && <p className="text-sm text-success">{uz.customers.received}</p>}
    </form>
  );
}
