"use client";

import Decimal from "decimal.js";
import { CheckCircle2, Minus, Plus, Printer, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createEstimateAction, createSaleAction, type CreatedState } from "@/app/pos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatAmount, formatSum } from "@/lib/services/money";
import { parseQuantity, percentOf } from "@/lib/services/sale-math";
import { cn } from "@/lib/utils";
import type { PickedCustomer } from "./customer-picker";
import { EstimatePanel, type EstimateValues } from "./estimate-panel";
import { PaymentDialog, type PaymentValues } from "./payment-panel";
import { ProductGrid } from "./product-grid";
import { ProductSearch, type SearchProduct } from "./product-search";
import { ShiftChip, type OpenShiftInfo } from "./shift-chip";
import { ProductThumb } from "./product-thumb";
import { useCart, type AttachedEstimate, type CartLine } from "./use-cart";

type Props = {
  storageKey: string;
  shopName: string;
  categories: { id: string; name: string }[];
  initialProducts: SearchProduct[];
  topProducts: SearchProduct[];
  initialEstimate: (AttachedEstimate & { lines: CartLine[]; discount: number }) | null;
  initialOrder?: (AttachedEstimate & { lines: CartLine[]; customer: PickedCustomer | null }) | null;
  shift: OpenShiftInfo | null;
  /** Tarifdagi modullar: smeta tugmasi, mijoz/usta tanlash */
  features?: { estimates: boolean; customers: boolean };
};

type Mode = "cart" | "payment" | "estimate";

export function PosTerminal({
  storageKey,
  shopName,
  categories,
  initialProducts,
  topProducts,
  initialEstimate,
  initialOrder,
  shift,
  features = { estimates: true, customers: true },
}: Props) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("cart");
  const [result, setResult] = useState<CreatedState>({});
  const [pending, startTransition] = useTransition();
  // Oxirgi sotuv: chek printerga yuboriladi (yashirin oyna), ekranda faqat qisqa xabar
  const [lastSale, setLastSale] = useState<{ id: string; number: number; earned: number } | null>(
    null,
  );
  const [printJob, setPrintJob] = useState<{ id: string; nonce: number } | null>(null);

  const [initial] = useState(() =>
    initialEstimate
      ? {
          lines: initialEstimate.lines,
          discount: initialEstimate.discount ? String(initialEstimate.discount) : "",
          estimate: { id: initialEstimate.id, number: initialEstimate.number },
        }
      : initialOrder
        ? {
            lines: initialOrder.lines,
            discount: "",
            estimate: null,
            order: { id: initialOrder.id, number: initialOrder.number },
            customer: initialOrder.customer,
          }
        : null,
  );
  const cart = useCart(storageKey, initial);
  const { lines, totals, ready } = cart;
  const estimate = cart.cart.estimate;
  const order = cart.cart.order ?? null;
  const customer = cart.cart.customer ?? null;
  const master = cart.cart.master ?? null;

  // Sahifa manzilidan ?estimate=... / ?order=... olib tashlanadi — yangilanganda qayta yuklanmasin
  useEffect(() => {
    if (initialEstimate || initialOrder) router.replace("/pos");
  }, [initialEstimate, initialOrder, router]);

  /** Shaxsiy chegirmali mijoz tanlansa (chegirma bo'sh bo'lsa) — chegirma o'zi qo'yiladi. */
  function pickCustomer(c: PickedCustomer | null) {
    cart.setCustomer(c);
    if (c?.discountPercent && !cart.cart.discount.trim() && !estimate) {
      const amount = percentOf(totals.subtotal, c.discountPercent);
      if (amount > 0) cart.setDiscount(formatAmount(amount));
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2" && mode === "cart" && ready) {
        e.preventDefault();
        setResult({});
        setMode("payment");
      }
      if (e.key === "Escape" && mode === "estimate" && !pending) backToCart();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, ready, pending]);

  useEffect(() => {
    if (mode === "cart") searchRef.current?.focus();
  }, [mode, cart.activeTab]);

  function payload() {
    return {
      items: cart.cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      discount: cart.cart.discount,
    };
  }

  /** Server qatorga yoki chegirmaga oid xato qaytarsa — tuzatish uchun savatchaga qaytamiz. */
  function handleError(res: CreatedState) {
    setResult(res);
    const keys = Object.keys(res.fieldErrors ?? {});
    if (keys.some((k) => k.startsWith("items"))) setMode("cart");
  }

  function confirmSale({ dueDate, ...payments }: PaymentValues) {
    startTransition(async () => {
      const res = await createSaleAction({
        ...payload(),
        payments: customer ? payments : { ...payments, debt: "", points: "" },
        dueDate: dueDate || undefined,
        estimateId: estimate?.id,
        orderId: order?.id,
        customerId: customer?.id,
        masterId: master?.id,
      });
      if (!res.ok || !res.id) return handleError(res);
      setResult({});
      setLastSale({ id: res.id, number: res.number ?? 0, earned: res.earned ?? 0 });
      setPrintJob({ id: res.id, nonce: Date.now() });
      cart.finishActive();
      setMode("cart");
      router.refresh();
    });
  }

  function saveEstimate(values: EstimateValues) {
    startTransition(async () => {
      const res = await createEstimateAction({ ...payload(), ...values });
      if (!res.ok || !res.id) return handleError(res);
      cart.finishActive();
      router.push(`/pos/estimates/${res.id}`);
    });
  }

  function step(line: CartLine, delta: 1 | -1) {
    const q = parseQuantity(line.quantity, line.unit);
    const current = q.ok ? q.value : new Decimal(1);
    const next = current.plus(delta);
    if (next.lte(0)) return;
    cart.setQuantity(line.productId, next.toString());
  }

  function backToCart() {
    setMode("cart");
    setResult({});
  }

  // Server qatorga oid xato qaytarsa ("items.2"), shu qatorda ko'rsatiladi
  const lineErrors = new Map(
    Object.entries(result.fieldErrors ?? {})
      .filter(([k]) => k.startsWith("items."))
      .map(([k, v]) => [Number(k.split(".")[1]), v]),
  );
  const generalError =
    result.error ??
    (result.fieldErrors && !lineErrors.size
      ? (result.fieldErrors.payments ??
        result.fieldErrors.discount ??
        result.fieldErrors.masterId ??
        result.fieldErrors.items)
      : undefined);

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Chap: qidiruv, kategoriyalar, mahsulotlar */}
      <section className="flex min-w-0 flex-1 flex-col gap-3 p-3 md:p-4 lg:overflow-y-auto">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">{shopName}</h1>
            <p className="text-xs text-muted-foreground">{uz.pos.shortcutsHint}</p>
          </div>
          <ShiftChip shift={shift} />
          <div className="w-full sm:ml-auto sm:w-96">
            <ProductSearch ref={searchRef} onPick={cart.addProduct} />
          </div>
        </div>
        <ProductGrid
          categories={categories}
          initialProducts={initialProducts}
          topProducts={topProducts}
          onPick={cart.addProduct}
          disabled={mode !== "cart"}
        />
      </section>

      {/* O'ng: navbat va savatcha */}
      <aside className="flex w-full flex-col border-t bg-card lg:h-screen lg:w-[380px] lg:shrink-0 lg:border-t-0 lg:border-l">
        {/* Navbatdagi mijozlar: har biriga alohida savatcha */}
        <div
          className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2"
          role="tablist"
          aria-label={uz.pos.queueLabel}
        >
          {cart.tabs.map((tab) => {
            const active = tab.label === cart.activeTab;
            return (
              <span
                key={tab.label}
                className={cn(
                  "flex shrink-0 items-center rounded-lg text-sm font-medium",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => cart.selectTab(tab.label)}
                  className="py-1.5 pr-1 pl-3"
                  data-testid="cart-tab"
                >
                  {t(uz.pos.customerTab, { n: tab.label })}
                  {tab.count > 0 && <span className="ml-1 opacity-80">({tab.count})</span>}
                </button>
                {cart.tabs.length > 1 && (
                  <button
                    type="button"
                    aria-label={`${uz.pos.closeTab}: ${t(uz.pos.customerTab, { n: tab.label })}`}
                    onClick={() => {
                      if (tab.count === 0 || window.confirm(uz.pos.confirmCloseTab)) {
                        cart.closeTab(tab.label);
                      }
                    }}
                    className="rounded-md p-1 pr-2 opacity-70 hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </span>
            );
          })}
          <button
            type="button"
            onClick={cart.newTab}
            disabled={mode !== "cart"}
            title={uz.pos.newCustomerTab}
            aria-label={uz.pos.newCustomerTab}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed text-primary hover:bg-accent"
          >
            <UserPlus className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <h2 className="text-base font-bold">{uz.pos.order}</h2>
          <Button
            size="sm"
            disabled={lines.length === 0 || mode !== "cart"}
            onClick={() => {
              if (window.confirm(uz.pos.confirmClear)) cart.clear();
            }}
            className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40"
          >
            <Trash2 className="size-4" />
            {uz.pos.clear}
          </Button>
        </div>

        {lastSale && (
          <div
            role="status"
            className="mx-4 mb-2 flex flex-col gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground"
            data-testid="sale-done"
          >
            <span className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4" />
              {t(uz.pos.saleDone, { number: lastSale.number })}
            </span>
            {lastSale.earned > 0 && (
              <span className="text-xs" data-testid="points-earned">
                {t(uz.promotions.earned, { points: formatAmount(lastSale.earned) })}
              </span>
            )}
            <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <button
                type="button"
                className="inline-flex items-center gap-1 font-semibold underline"
                onClick={() => setPrintJob({ id: lastSale.id, nonce: Date.now() })}
              >
                <Printer className="size-3.5" />
                {uz.pos.reprint}
              </button>
              <Link href={`/pos/sales/${lastSale.id}`} className="font-semibold underline">
                {uz.pos.openReceipt}
              </Link>
            </span>
          </div>
        )}

        {estimate && (
          <div className="mx-4 mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">
            <Badge>
              {uz.estimates.number} {estimate.number}
            </Badge>
            <span>{uz.pos.pricesFromEstimate}</span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => {
                if (window.confirm(uz.pos.confirmLeaveEstimate)) cart.clear();
              }}
            >
              {uz.pos.leaveEstimate}
            </Button>
          </div>
        )}

        {order && (
          <div
            className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground"
            data-testid="cart-order"
          >
            <Badge>{t(uz.orders.fromOrder, { number: order.number })}</Badge>
            {customer && <span className="truncate">{customer.name}</span>}
          </div>
        )}

        {/* Savatcha qatorlari — faqat shu qism aylanadi, pastki jami doim ko'rinadi */}
        <div className="flex min-h-40 flex-1 flex-col gap-1.5 overflow-y-auto px-4">
          {lines.length === 0 ? (
            <p className="m-auto max-w-56 py-8 text-center text-sm text-muted-foreground">
              {uz.pos.cartEmpty}
            </p>
          ) : (
            lines.map((line, index) => {
              const error = line.error ?? lineErrors.get(index);
              return (
                <div
                  key={line.productId}
                  data-testid="cart-line"
                  className="flex items-center gap-2 rounded-xl border bg-card px-2.5 py-2"
                >
                  <ProductThumb
                    product={{
                      id: line.productId,
                      unit: line.unit,
                      imageVersion: line.imageVersion,
                    }}
                    className="size-9"
                    iconClassName="size-5"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm leading-5 font-semibold" title={line.name}>
                      {line.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatSum(line.price)} / {uz.units[line.unit]}
                    </span>
                    {error && <span className="text-xs text-destructive">{error}</span>}
                    {!error && line.lowStock && (
                      <span className="text-xs">
                        <span className="rounded bg-warning px-1 text-warning-foreground">
                          {uz.warehouse.notEnoughStock}: {formatQuantity(line.stock ?? "0")}{" "}
                          {uz.units[line.unit]}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${uz.pos.decrease}: ${line.name}`}
                        onClick={() => step(line, -1)}
                        className="flex size-7 items-center justify-center rounded-full border text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <Input
                        value={line.quantity}
                        onChange={(e) => cart.setQuantity(line.productId, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        inputMode="decimal"
                        aria-label={`${uz.pos.quantity}: ${line.name}`}
                        aria-invalid={!!error}
                        className="h-7 w-14 px-1 text-center text-sm tabular-nums"
                      />
                      <button
                        type="button"
                        aria-label={`${uz.pos.increase}: ${line.name}`}
                        onClick={() => step(line, 1)}
                        className="flex size-7 items-center justify-center rounded-full border text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {formatSum(line.total)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`${uz.pos.remove}: ${line.name}`}
                    onClick={() => cart.removeLine(line.productId)}
                    className="self-start text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pastki qism: jami va to'lovga o'tish (mijoz, usta, chegirma — to'lov oynasida) */}
        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t bg-card px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {t(uz.pos.itemsCount, { count: lines.length })}
              {totals.discount > 0 && ` · ${uz.pos.discount}: ${formatSum(totals.discount)}`}
            </span>
            <span className="text-2xl font-bold text-primary tabular-nums" data-testid="cart-total">
              {formatSum(totals.total)}
            </span>
          </div>
          {generalError && mode === "cart" && (
            <p className="text-sm text-destructive">{generalError}</p>
          )}
          <div className="flex gap-2">
            {!estimate && features.estimates && (
              <Button
                variant="outline"
                size="lg"
                className="h-12"
                disabled={!ready}
                onClick={() => {
                  setResult({});
                  setMode("estimate");
                }}
              >
                {uz.estimates.estimate}
              </Button>
            )}
            <Button
              size="lg"
              className="h-12 flex-1 text-base"
              disabled={!ready}
              onClick={() => {
                setResult({});
                setMode("payment");
              }}
            >
              {uz.pos.pay} (F2)
            </Button>
          </div>
        </div>
      </aside>

      {mode === "payment" && (
        <PaymentDialog
          subtotal={totals.subtotal}
          total={totals.total}
          discount={cart.cart.discount}
          discountProblem={cart.discountProblem}
          onDiscountChange={cart.setDiscount}
          customer={customer}
          master={master}
          onCustomerChange={pickCustomer}
          onMasterChange={cart.setMaster}
          customersEnabled={features.customers}
          pending={pending}
          error={generalError}
          onConfirm={confirmSale}
          onClose={backToCart}
        />
      )}

      {mode === "estimate" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) backToCart();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={uz.pos.saveEstimate}
            className="flex max-h-[100dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl bg-card p-6 shadow-xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="est-discount" className="text-sm text-muted-foreground">
                {uz.pos.discount}
              </label>
              <Input
                id="est-discount"
                value={cart.cart.discount}
                onChange={(e) => cart.setDiscount(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                aria-invalid={!!cart.discountProblem}
                className="h-9 w-36 text-right tabular-nums"
              />
            </div>
            {cart.discountProblem && (
              <p className="text-xs text-destructive">{cart.discountProblem}</p>
            )}
            <EstimatePanel
              total={totals.total}
              pending={pending}
              error={generalError}
              fieldErrors={result.fieldErrors}
              onSave={saveEstimate}
              onBack={backToCart}
            />
          </div>
        </div>
      )}

      {/* Chek printerga: yashirin oynada chek sahifasi ochiladi va o'zi chop etadi */}
      {printJob && (
        <iframe
          key={printJob.nonce}
          src={`/chek/${printJob.id}?print=1`}
          title={uz.pos.receiptPrinting}
          className="pointer-events-none fixed right-0 bottom-0 size-0 border-0 opacity-0"
          aria-hidden
          tabIndex={-1}
        />
      )}
    </div>
  );
}
