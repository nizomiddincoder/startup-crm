"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t, uz } from "@/lib/i18n/uz";
import { formatAmount, formatSum } from "@/lib/services/money";
import { settlePayments } from "@/lib/services/sale-math";
import { CustomerPicker, type PickedCustomer } from "./customer-picker";
import { amountOrZero } from "./use-cart";

export type PaymentValues = {
  cash: string;
  card: string;
  transfer: string;
  debt: string;
  points: string;
  dueDate: string;
};

type Props = {
  subtotal: number;
  total: number;
  discount: string;
  discountProblem: string | null;
  onDiscountChange: (value: string) => void;
  customer: PickedCustomer | null;
  master: PickedCustomer | null;
  onCustomerChange: (c: PickedCustomer | null) => void;
  onMasterChange: (c: PickedCustomer | null) => void;
  /** "Mijozlar" moduli o'chiq bo'lsa — mijoz, usta, nasiya va ball yo'q */
  customersEnabled?: boolean;
  pending: boolean;
  error?: string;
  onConfirm: (values: PaymentValues) => void;
  onClose: () => void;
};

const fields = [
  { key: "cash", label: uz.pos.cash },
  { key: "card", label: uz.pos.card },
  { key: "transfer", label: uz.pos.transfer },
  { key: "debt", label: uz.pos.debt },
] as const;

type AmountKey = (typeof fields)[number]["key"] | "points";

/**
 * Bitta to'lov oynasi: mijoz, usta, chegirma va barcha to'lov turlari bir joyda.
 * Sukut bo'yicha butun summa naqd; kassir summalarni o'zgartirmaguncha naqd jami summaga
 * ergashadi (chegirma o'zgarsa ham). Enter — sotuvni yakunlash, Esc — yopish.
 */
export function PaymentDialog({
  subtotal,
  total,
  discount,
  discountProblem,
  onDiscountChange,
  customer,
  master,
  onCustomerChange,
  onMasterChange,
  customersEnabled = true,
  pending,
  error,
  onConfirm,
  onClose,
}: Props) {
  const [values, setValues] = useState<PaymentValues>({
    cash: formatAmount(total),
    card: "",
    transfer: "",
    debt: "",
    points: "",
    dueDate: "",
  });
  const [touched, setTouched] = useState(false);

  // Summalarga tegilmagan bo'lsa — naqd jami summaga ergashadi
  useEffect(() => {
    if (!touched) setValues((v) => ({ ...v, cash: formatAmount(total) }));
  }, [total, touched]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const parsed = {
    cash: amountOrZero(values.cash),
    card: amountOrZero(values.card),
    transfer: amountOrZero(values.transfer),
    debt: customer ? amountOrZero(values.debt) : 0,
    points: customer ? amountOrZero(values.points) : 0,
  };
  const invalid = Object.values(parsed).some((v) => v === null);
  const amounts = parsed as Record<AmountKey, number>;
  const settlement = invalid ? null : settlePayments(total, amounts);
  const paid = invalid
    ? 0
    : amounts.cash + amounts.card + amounts.transfer + amounts.debt + amounts.points;
  // Ball qatori faqat mijozda ball bo'lsa chiqadi
  const availablePoints = customer?.points ?? 0;
  const pointsTooMany = !invalid && amounts.points > availablePoints;

  // Limitni kassada ham oldindan ko'rsatamiz (server baribir tekshiradi)
  const limitExceeded =
    !!customer &&
    customer.creditLimit !== null &&
    !invalid &&
    amounts.debt > 0 &&
    customer.debt + amounts.debt > customer.creditLimit;

  const set = (patch: Partial<PaymentValues>) => {
    setTouched(true);
    setValues((v) => ({ ...v, ...patch }));
  };
  const all = (key: AmountKey) =>
    set({ cash: "", card: "", transfer: "", debt: "", points: "", [key]: formatAmount(total) });
  // Ballar summani to'liq yopmasa — qolgani naqd
  const usePoints = () => {
    const p = Math.min(availablePoints, total);
    set({
      points: formatAmount(p),
      cash: formatAmount(total - p),
      card: "",
      transfer: "",
      debt: "",
    });
  };
  const canConfirm =
    settlement?.ok && !limitExceeded && !pointsTooMany && !discountProblem && !pending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-y-auto rounded-t-3xl bg-card shadow-xl sm:rounded-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm(customer ? values : { ...values, debt: "", points: "" });
        }}
      >
        <header className="flex items-center justify-between gap-3 border-b px-6 py-4">
          <h2 id="payment-title" className="text-lg font-bold">
            {uz.pos.paymentTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label={uz.common.back}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Chap: kim xarid qilyapti va chegirma */}
          <section className="flex flex-col gap-4">
            {customersEnabled && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {uz.pos.customerAndMaster}
                </h3>
                <CustomerPicker
                  label={uz.customers.customer}
                  value={customer}
                  onChange={onCustomerChange}
                />
                <CustomerPicker
                  label={uz.customers.master}
                  value={master}
                  onChange={onMasterChange}
                  mastersOnly
                />
              </>
            )}
            <div className="flex flex-col gap-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{uz.pos.subtotal}</span>
                <span className="font-medium tabular-nums">{formatSum(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="discount" className="text-muted-foreground">
                  {uz.pos.discount}
                </label>
                <Input
                  id="discount"
                  value={discount}
                  onChange={(e) => onDiscountChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!discountProblem}
                  className="h-9 w-36 text-right tabular-nums"
                />
              </div>
              {discountProblem && <p className="text-xs text-destructive">{discountProblem}</p>}
            </div>
          </section>

          {/* O'ng: summa va to'lov turlari */}
          <section className="flex flex-col gap-3">
            <div className="rounded-2xl bg-accent p-4 text-center text-accent-foreground">
              <div className="text-sm">{uz.pos.total}</div>
              <div className="text-3xl font-bold tabular-nums" data-testid="payment-total">
                {formatSum(total)}
              </div>
            </div>

            {fields
              .filter((f) => customersEnabled || f.key !== "debt")
              .map((f) => {
                const disabled = f.key === "debt" && !customer;
                return (
                  <div key={f.key} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2">
                    <Label htmlFor={`pay-${f.key}`}>{f.label}</Label>
                    <Input
                      id={`pay-${f.key}`}
                      inputMode="numeric"
                      value={disabled ? "" : values[f.key]}
                      onChange={(e) => set({ [f.key]: e.target.value })}
                      onFocus={(e) => e.target.select()}
                      autoFocus={f.key === "cash"}
                      disabled={disabled}
                      placeholder={disabled ? uz.customers.customerRequired : undefined}
                      aria-invalid={parsed[f.key] === null}
                      className="h-11 text-right text-lg tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => all(f.key)}
                      aria-label={
                        f.key === "cash"
                          ? uz.pos.allByCash
                          : f.key === "card"
                            ? uz.pos.allByCard
                            : f.key === "debt"
                              ? uz.pos.allByDebt
                              : `${uz.pos.payWhole}: ${f.label}`
                      }
                    >
                      {uz.pos.payWhole}
                    </Button>
                  </div>
                );
              })}

            {customer && availablePoints > 0 && (
              <div className="grid grid-cols-[6rem_1fr_auto] items-center gap-2">
                <Label htmlFor="pay-points">{uz.paymentMethods.POINTS}</Label>
                <Input
                  id="pay-points"
                  inputMode="numeric"
                  value={values.points}
                  onChange={(e) => set({ points: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  placeholder={t(uz.promotions.pointsAvailable, {
                    points: formatAmount(availablePoints),
                  })}
                  aria-invalid={parsed.points === null || pointsTooMany}
                  className="h-11 text-right text-lg tabular-nums"
                />
                <Button type="button" variant="outline" size="sm" onClick={usePoints}>
                  {uz.pos.payWhole}
                </Button>
              </div>
            )}
            {pointsTooMany && (
              <p className="text-sm text-destructive">{uz.promotions.pointsTooMany}</p>
            )}

            {customer && amounts.debt > 0 && (
              <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
                <Label htmlFor="pay-due">{uz.customers.dueDate}</Label>
                <Input
                  id="pay-due"
                  type="date"
                  value={values.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                />
              </div>
            )}

            <div className="flex flex-col gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>{uz.pos.paid}</span>
                <span className="tabular-nums">{formatSum(paid)}</span>
              </div>
              {limitExceeded ? (
                <p className="text-destructive">{uz.customers.creditLimitExceeded}</p>
              ) : settlement?.ok ? (
                <div className="flex justify-between text-lg font-semibold">
                  <span>{uz.pos.change}</span>
                  <span className="tabular-nums" data-testid="payment-change">
                    {formatSum(settlement.change)}
                  </span>
                </div>
              ) : (
                <p className="text-destructive">
                  {invalid
                    ? uz.validation.invalidPrice
                    : paid < total
                      ? `${uz.pos.remaining}: ${formatSum(total - paid)}`
                      : settlement?.error}
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="h-14 text-lg" disabled={!canConfirm}>
              {pending ? uz.pos.saving : uz.pos.confirmSale}
            </Button>
          </section>
        </div>
      </form>
    </div>
  );
}
