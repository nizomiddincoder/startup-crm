"use client";

import Decimal from "decimal.js";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createReturnAction } from "@/app/pos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { parseQuantity, returnLineAmount } from "@/lib/services/sale-math";
import type { UnitValue } from "@/lib/validation/product";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  unit: UnitValue;
  price: number;
  total: number;
  quantity: string;
  returned: string;
  left: string;
};

type Props = {
  sale: {
    id: string;
    subtotal: number;
    total: number;
    returnedTotal: number;
    pointsPaid: number;
    hasCustomer: boolean;
    hadDebt: boolean;
  };
  items: Item[];
};

const METHODS = ["CASH", "CARD", "TRANSFER", "DEBT"] as const;

/** Chek bo'yicha qaytarish: har qatorga qaytariladigan miqdor, pul qaytarish usuli va sabab. */
export function ReturnForm({ sale, items }: Props) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<(typeof METHODS)[number]>(sale.hadDebt ? "DEBT" : "CASH");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();

  // Ekrandagi summa serverdagi bilan bir xil formula (sale-math.ts)
  const rows = items.map((item) => {
    const raw = quantities[item.id] ?? "";
    if (!raw.trim()) return { item, amount: 0, problem: null as string | null };
    const q = parseQuantity(raw, item.unit);
    if (!q.ok) return { item, amount: 0, problem: q.error };
    if (q.value.gt(item.left)) return { item, amount: 0, problem: uz.returns.tooMuch };
    return { item, amount: returnLineAmount(item, q.value, sale), problem: null };
  });
  const total = Math.max(
    Math.min(
      rows.reduce((s, r) => s + r.amount, 0),
      sale.total - sale.pointsPaid - sale.returnedTotal,
    ),
    0,
  );
  const ready = total > 0 && rows.every((r) => !r.problem);

  function submit() {
    setError(undefined);
    start(async () => {
      const res = await createReturnAction({
        saleId: sale.id,
        items: items.map((i) => ({ saleItemId: i.id, quantity: quantities[i.id] ?? "" })),
        refundMethod: method,
        reason,
      });
      if (res.ok) {
        router.push(`/pos/sales/${sale.id}`);
        router.refresh();
        return;
      }
      setFieldErrors(res.fieldErrors ?? {});
      setError(res.error ?? res.fieldErrors?.items ?? res.fieldErrors?.refundMethod);
    });
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !pending) submit();
      }}
    >
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">{uz.pos.product}</th>
              <th className="px-4 py-2 text-right font-medium">{uz.returns.sold}</th>
              <th className="px-4 py-2 text-right font-medium">{uz.returns.alreadyReturned}</th>
              <th className="px-4 py-2 text-right font-medium">{uz.returns.toReturn}</th>
              <th className="px-4 py-2 text-right font-medium">{uz.pos.sum}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, amount, problem }, index) => {
              const none = new Decimal(item.left).lte(0);
              const serverError = fieldErrors[`items.${index}`];
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatSum(item.price)} / {uz.units[item.unit]}
                    </span>
                    {(problem || serverError) && (
                      <span className="block text-xs text-destructive">
                        {problem ?? serverError}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatQuantity(item.quantity)} {uz.units[item.unit]}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                    {new Decimal(item.returned).gt(0) ? formatQuantity(item.returned) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input
                      value={quantities[item.id] ?? ""}
                      onChange={(e) => setQuantities((q) => ({ ...q, [item.id]: e.target.value }))}
                      inputMode="decimal"
                      placeholder="0"
                      disabled={none}
                      aria-label={`${uz.returns.toReturn}: ${item.name}`}
                      aria-invalid={!!problem}
                      className="ml-auto h-9 w-24 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {amount ? formatSum(amount) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">{uz.returns.refundMethod}</legend>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => {
              const disabled = m === "DEBT" && !sale.hasCustomer;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  disabled={disabled}
                  title={disabled ? uz.returns.debtNeedsCustomer : undefined}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-semibold disabled:opacity-40",
                    method === m
                      ? "border-foreground bg-foreground text-background"
                      : "bg-card text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  {m === "DEBT" ? uz.returns.refundDebt : uz.paymentMethods[m]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="return-reason">{uz.returns.reason}</Label>
          <Input
            id="return-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={uz.returns.reasonPlaceholder}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent px-5 py-4 text-accent-foreground">
        <span className="text-sm">{uz.returns.amount}</span>
        <span className="text-2xl font-bold tabular-nums" data-testid="return-total">
          {formatSum(total)}
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12" disabled={!ready || pending}>
        {pending ? uz.pos.saving : uz.returns.confirm}
      </Button>
      {!ready && total === 0 && (
        <p className="text-center text-sm text-muted-foreground">{uz.returns.nothingSelected}</p>
      )}
    </form>
  );
}
