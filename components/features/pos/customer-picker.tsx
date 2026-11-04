"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { quickCreateCustomerAction, searchCustomersAction } from "@/app/pos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uz } from "@/lib/i18n/uz";
import { formatSum } from "@/lib/services/money";

export type PickedCustomer = {
  id: string;
  name: string;
  phone: string | null;
  debt: number;
  creditLimit: number | null;
  /** Shaxsiy chegirma (%), masalan "5" */
  discountPercent?: string | null;
  /** Bonus ballari (1 ball = 1 so'm) */
  points?: number;
};

type Props = {
  label: string;
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  /** Usta tanlash: faqat ustalar, tezkor qo'shish yo'q (ustani egasi/menejer belgilaydi) */
  mastersOnly?: boolean;
  disabled?: boolean;
};

export function CustomerPicker({ label, value, onChange, mastersOnly = false, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedCustomer[]>([]);
  const [adding, setAdding] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const found = await searchCustomersAction(q, mastersOnly);
      if (id === requestId.current) setResults(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, mastersOnly]);

  function pick(c: PickedCustomer) {
    onChange(c);
    setQuery("");
    setResults([]);
    setAdding(false);
    setError(undefined);
  }

  function quickAdd() {
    startTransition(async () => {
      const res = await quickCreateCustomerAction({ name: query, phone: newPhone });
      if (res.ok) pick(res.customer);
      else setError(res.error ?? Object.values(res.fieldErrors ?? {})[0]);
    });
  }

  if (value) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <div
              className="truncate font-medium"
              data-testid={mastersOnly ? "picked-master" : "picked-customer"}
            >
              {value.name}
            </div>
            {!mastersOnly && value.debt > 0 && (
              <div className="text-xs text-destructive">
                {uz.customers.currentDebt}: {formatSum(value.debt)}
              </div>
            )}
          </div>
          {!disabled && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${uz.customers.remove}: ${label}`}
              onClick={() => onChange(null)}
            >
              <X />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setError(undefined);
        }}
        placeholder={uz.customers.searchPlaceholder}
        aria-label={label}
        disabled={disabled}
        autoComplete="off"
      />
      {(results.length > 0 || (!mastersOnly && query.trim().length >= 2)) && !adding && (
        <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span>
                  {c.name}
                  {c.phone && <span className="ml-2 text-muted-foreground">{c.phone}</span>}
                </span>
                {c.debt > 0 && <Badge variant="destructive">{formatSum(c.debt)}</Badge>}
              </button>
            </li>
          ))}
          {!mastersOnly && (
            <li>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-accent"
              >
                + {uz.customers.quickAdd}: «{query.trim()}»
              </button>
            </li>
          )}
        </ul>
      )}
      {adding && (
        <div className="flex flex-col gap-2 rounded-lg border p-2">
          <div className="text-sm font-medium">{query.trim()}</div>
          <Input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder={uz.auth.phonePlaceholder}
            aria-label={uz.customers.phone}
            type="tel"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={quickAdd} disabled={pending}>
              {uz.common.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              {uz.common.cancel}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
