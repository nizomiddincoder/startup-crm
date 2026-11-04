"use client";

import Decimal from "decimal.js";
import { useEffect, useMemo, useState } from "react";
import { parseSum } from "@/lib/services/money";
import { calcTotals, discountError, lineTotal, parseQuantity } from "@/lib/services/sale-math";
import type { UnitValue } from "@/lib/validation/product";
import { uz } from "@/lib/i18n/uz";
import type { PickedCustomer } from "./customer-picker";

export type CartProduct = {
  id: string;
  name: string;
  unit: UnitValue;
  salePrice: number;
  stock?: string;
  imageVersion?: number;
};

export type CartLine = {
  productId: string;
  name: string;
  unit: UnitValue;
  /** Faqat ko'rsatish uchun. Serverda narx qayta bazadan (yoki smetadan) olinadi. */
  price: number;
  quantity: string;
  /** Qo'shilgan paytdagi ombor qoldig'i — faqat ogohlantirish uchun, sotuvni to'xtatmaydi */
  stock?: string;
  imageVersion?: number;
};

export type AttachedEstimate = { id: string; number: number };

export type CartState = {
  lines: CartLine[];
  discount: string;
  estimate: AttachedEstimate | null;
  /** Telegram buyurtmasidan yuklangan savatcha — sotilsa buyurtma "Sotildi" bo'ladi */
  order?: AttachedEstimate | null;
  customer?: PickedCustomer | null;
  master?: PickedCustomer | null;
};

/** Navbatdagi har bir mijozning savatchasi. `label` — ekrandagi "Mijoz 3" raqami. */
type CartTab = CartState & { label: number };

type TabsState = { tabs: CartTab[]; active: number; nextLabel: number };

const emptyCart: CartState = {
  lines: [],
  discount: "",
  estimate: null,
  order: null,
  customer: null,
  master: null,
};

const freshTabs = (initial: CartState | null): TabsState => ({
  tabs: [{ ...(initial ?? emptyCart), label: 1 }],
  active: 1,
  nextLabel: 2,
});

/** Bo'sh maydon — 0; noto'g'ri matn — null. */
export function amountOrZero(value: string): number | null {
  return value.trim() === "" ? 0 : parseSum(value);
}

function loadTabs(key: string): TabsState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TabsState | CartState;
    // Eski format (bitta savatcha) — birinchi mijoz sifatida
    if ("lines" in parsed) return { tabs: [{ ...parsed, label: 1 }], active: 1, nextLabel: 2 };
    return parsed.tabs?.length ? parsed : null;
  } catch {
    return null;
  }
}

/** Savatcha hisob-kitobi (qatorlar summasi, chegirma, xatolar) — sof funksiya. */
export function computeCart(cart: CartState) {
  const lines = cart.lines.map((line) => {
    const q = parseQuantity(line.quantity, line.unit);
    return {
      ...line,
      error: q.ok ? null : q.error,
      total: q.ok ? lineTotal(line.price, q.value) : 0,
      lowStock: q.ok && line.stock !== undefined && q.value.gt(line.stock),
    };
  });
  const discountValue = amountOrZero(cart.discount);
  const totals = calcTotals(
    lines.map((l) => l.total),
    discountValue ?? 0,
  );
  const discountProblem =
    discountValue === null
      ? uz.validation.invalidPrice
      : discountError(discountValue, totals.subtotal);
  const ready = lines.length > 0 && lines.every((l) => !l.error) && !discountProblem;
  return { lines, totals, discountProblem, ready };
}

/**
 * Kassa savatchalari: navbatdagi har bir mijozga alohida savatcha (yorliqlar). Brauzer xotirasida
 * saqlanadi — sahifa tasodifan yangilansa ham yo'qolmaydi. `initial` (smeta) berilsa — u bo'sh
 * savatchaga, bo'sh savatcha bo'lmasa yangi yorliqqa yuklanadi.
 */
export function useCart(storageKey: string, initial: CartState | null) {
  const [state, setState] = useState<TabsState>(() => freshTabs(null));
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (restored) return;
    let next = loadTabs(storageKey) ?? freshTabs(null);
    if (initial) {
      const empty = next.tabs.find((t) => t.lines.length === 0);
      if (empty) {
        next = {
          ...next,
          active: empty.label,
          tabs: next.tabs.map((t) =>
            t.label === empty.label ? { ...initial, label: t.label } : t,
          ),
        };
      } else {
        next = {
          tabs: [...next.tabs, { ...initial, label: next.nextLabel }],
          active: next.nextLabel,
          nextLabel: next.nextLabel + 1,
        };
      }
    }
    setState(next);
    setRestored(true);
  }, [restored, storageKey, initial]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Xotira yopiq bo'lsa (maxfiy rejim) — savatcha baribir ishlaydi, faqat saqlanmaydi
    }
  }, [state, restored, storageKey]);

  const cart = state.tabs.find((t) => t.label === state.active) ?? state.tabs[0];
  const computed = useMemo(() => computeCart(cart), [cart]);

  /** Faqat faol savatchani o'zgartiradi. */
  function update(fn: (c: CartTab) => CartTab) {
    setState((s) => ({ ...s, tabs: s.tabs.map((t) => (t.label === s.active ? fn(t) : t)) }));
  }

  function addProduct(product: CartProduct) {
    update((c) => {
      const existing = c.lines.find((l) => l.productId === product.id);
      if (!existing) {
        const line: CartLine = {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          price: product.salePrice,
          quantity: "1",
          stock: product.stock,
          imageVersion: product.imageVersion,
        };
        return { ...c, lines: [...c.lines, line] };
      }
      const current = parseQuantity(existing.quantity, existing.unit);
      const next = current.ok ? current.value.plus(1) : new Decimal(1);
      return {
        ...c,
        lines: c.lines.map((l) =>
          l.productId === product.id ? { ...l, quantity: next.toString() } : l,
        ),
      };
    });
  }

  /** Mijoz xizmati tugadi (sotildi yoki bekor qilindi): yorliq yopiladi, oxirgisi — tozalanadi. */
  function finishActive() {
    setState((s) => {
      if (s.tabs.length === 1) return { ...s, tabs: [{ ...emptyCart, label: s.tabs[0].label }] };
      const index = s.tabs.findIndex((t) => t.label === s.active);
      const tabs = s.tabs.filter((t) => t.label !== s.active);
      return { ...s, tabs, active: tabs[Math.min(index, tabs.length - 1)].label };
    });
  }

  return {
    cart,
    restored,
    ...computed,
    addProduct,
    setQuantity: (productId: string, quantity: string) =>
      update((c) => ({
        ...c,
        lines: c.lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
      })),
    removeLine: (productId: string) =>
      update((c) => ({ ...c, lines: c.lines.filter((l) => l.productId !== productId) })),
    setDiscount: (discount: string) => update((c) => ({ ...c, discount })),
    setCustomer: (customer: PickedCustomer | null) => update((c) => ({ ...c, customer })),
    setMaster: (master: PickedCustomer | null) => update((c) => ({ ...c, master })),
    clear: () => update((c) => ({ ...emptyCart, label: c.label })),
    finishActive,
    // Navbat
    tabs: state.tabs.map((t) => ({ label: t.label, count: t.lines.length })),
    activeTab: state.active,
    selectTab: (label: number) => setState((s) => ({ ...s, active: label })),
    closeTab: (label: number) =>
      setState((s) => {
        if (s.tabs.length === 1) return { ...s, tabs: [{ ...emptyCart, label: s.tabs[0].label }] };
        const index = s.tabs.findIndex((t) => t.label === label);
        const tabs = s.tabs.filter((t) => t.label !== label);
        const active = s.active === label ? tabs[Math.min(index, tabs.length - 1)].label : s.active;
        return { ...s, tabs, active };
      }),
    newTab: () =>
      setState((s) => ({
        tabs: [...s.tabs, { ...emptyCart, label: s.nextLabel }],
        active: s.nextLabel,
        nextLabel: s.nextLabel + 1,
      })),
  };
}
