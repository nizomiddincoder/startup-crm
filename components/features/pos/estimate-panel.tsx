"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";
import { formatSum } from "@/lib/services/money";

export type EstimateValues = { customerName: string; customerPhone: string; note: string };

type Props = {
  total: number;
  pending: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
  onSave: (values: EstimateValues) => void;
  onBack: () => void;
};

export function EstimatePanel({ total, pending, error, fieldErrors = {}, onSave, onBack }: Props) {
  const [values, setValues] = useState<EstimateValues>({
    customerName: "",
    customerPhone: "",
    note: "",
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(values);
      }}
    >
      <div className="rounded-lg bg-muted p-4 text-center">
        <div className="text-sm text-muted-foreground">{uz.estimates.estimate}</div>
        <div className="text-2xl font-semibold tabular-nums">{formatSum(total)}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est-name">{uz.estimates.customerName}</Label>
        <Input
          id="est-name"
          value={values.customerName}
          onChange={(e) => setValues((v) => ({ ...v, customerName: e.target.value }))}
          autoFocus
        />
        {fieldErrors.customerName && (
          <p className="text-sm text-destructive">{fieldErrors.customerName}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est-phone">{uz.estimates.customerPhone}</Label>
        <Input
          id="est-phone"
          type="tel"
          placeholder={uz.auth.phonePlaceholder}
          value={values.customerPhone}
          onChange={(e) => setValues((v) => ({ ...v, customerPhone: e.target.value }))}
          aria-invalid={!!fieldErrors.customerPhone}
        />
        {fieldErrors.customerPhone && (
          <p className="text-sm text-destructive">{fieldErrors.customerPhone}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est-note">{uz.estimates.note}</Label>
        <Input
          id="est-note"
          placeholder={uz.estimates.notePlaceholder}
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending ? uz.pos.saving : uz.estimates.create}
      </Button>
      <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
        {uz.common.back}
      </Button>
    </form>
  );
}
