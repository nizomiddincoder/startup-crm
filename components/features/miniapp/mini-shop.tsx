"use client";

import {
  ClipboardList,
  Home,
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { UnitIcon } from "@/components/features/pos/unit-icon";
import { t, uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { cn } from "@/lib/utils";

// Telegram Mini App — do'kon ilovasi. Ma'lumot faqat /api/miniapp orqali keladi.
// Dizayn: yengil fon, oq kartochkalar, yashil (primary) aksent, pastda navigatsiya.
type TgWebApp = { initData: string; ready(): void; expand(): void };
declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

type UnitValue = Parameters<typeof UnitIcon>[0]["unit"];
type ShopRef = { id: string; shop: string };
type Line = { productId: string; name: string; unit: string; price: number; quantity: string; total: number };
type Cart = { id: string; items: Line[]; total: number } | null;
type Product = { id: string; name: string; unit: string; salePrice: number; promoPercent: number | null };
type Catalog = {
  categories: { id: string; name: string }[];
  uncategorized: boolean;
  items: Product[];
  page: number;
  pages: number;
  cart: Cart;
};
type OrderRow = {
  number: number | null;
  status: string;
  total: number;
  submittedAt: string | null;
  tenant: { name: string };
};
type Tab = "catalog" | "cart" | "orders";

export function MiniShop() {
  const [initData, setInitData] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopRef[] | null>(null);
  const [shopId, setShopId] = useState("");
  const [tab, setTab] = useState<Tab>("catalog");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    setInitData(tg?.initData ?? "");
  }, []);

  const request = useCallback(
    async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
      const res = await fetch(path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": initData ?? "" },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok) throw new Error(data.error ?? uz.miniapp.error);
      return data;
    },
    [initData],
  );

  // Mijozning do'konlari
  useEffect(() => {
    if (!initData) return;
    request<{ shops: ShopRef[] }>("/api/miniapp?op=shops")
      .then((r) => {
        setShops(r.shops);
        setShopId(r.shops[0]?.id ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [initData, request]);

  // Katalog va savatcha (bir so'rovda)
  useEffect(() => {
    if (!initData || !shopId) return;
    let alive = true;
    request<Catalog>(
      `/api/miniapp?op=catalog&customerId=${encodeURIComponent(shopId)}&category=${encodeURIComponent(category)}&page=${page}`,
    )
      .then((c) => {
        if (alive) setCatalog(c);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [initData, shopId, category, page, version, request]);

  // Buyurtmalar ro'yxati
  useEffect(() => {
    if (tab !== "orders" || !initData || !shopId) return;
    let alive = true;
    request<{ orders: OrderRow[] }>(`/api/miniapp?op=orders&customerId=${encodeURIComponent(shopId)}`)
      .then((r) => {
        if (alive) setOrders(r.orders);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [tab, initData, shopId, version, request]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await request<{ number?: number | null }>("/api/miniapp", { ...body, customerId: shopId });
      setVersion((v) => v + 1);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const cart = catalog?.cart ?? null;
  const cartCount = cart?.items.length ?? 0;
  const qtyOf = (productId: string) =>
    Number(cart?.items.find((i) => i.productId === productId)?.quantity ?? 0);
  const shopName = shops?.find((s) => s.id === shopId)?.shop ?? "";
  const hasPromo = catalog?.items.some((p) => p.promoPercent) ?? false;

  if (initData === null) return <Shell><Centered>{uz.miniapp.loading}</Centered></Shell>;
  if (!initData) return <Shell><Centered>{uz.miniapp.openInTelegram}</Centered></Shell>;
  if (shops && shops.length === 0) return <Shell><Centered>{uz.miniapp.notRegistered}</Centered></Shell>;

  return (
    <Shell>
      <header className="flex items-center justify-between gap-3 px-4 pt-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{uz.miniapp.title}</p>
          <h1 className="truncate text-lg font-bold">{shopName}</h1>
        </div>
        <button
          type="button"
          onClick={() => setTab("cart")}
          aria-label={uz.miniapp.tabCart}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card"
        >
          <ShoppingCart className="size-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {shops && shops.length > 1 && (
        <div className="px-4">
          <select
            aria-label={uz.miniapp.shopPick}
            className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
            value={shopId}
            onChange={(e) => {
              setShopId(e.target.value);
              setCategory("");
              setPage(0);
            }}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shop}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p role="alert" className="mx-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mx-4 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">
          {notice}
        </p>
      )}

      {tab === "catalog" && catalog && (
        <section className="flex flex-col gap-5">
          {/* Kategoriyalar: yumaloq piktogrammalar */}
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {[{ id: "", name: uz.miniapp.allCategories }, ...catalog.categories].map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id || "all"}
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    setPage(0);
                  }}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "flex size-14 items-center justify-center rounded-2xl shadow-card transition-colors",
                      active ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                    )}
                  >
                    <Tag className="size-6" />
                  </span>
                  <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">{c.name}</span>
                </button>
              );
            })}
          </div>

          {hasPromo && (
            <div className="mx-4 flex items-center justify-between rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-card">
              <div>
                <p className="text-xs opacity-90">{uz.miniapp.promoLabel}</p>
                <p className="text-xl font-bold">{uz.miniapp.promoTitle}</p>
                <p className="text-xs opacity-90">{uz.miniapp.promoHint}</p>
              </div>
              <Tag className="size-10 opacity-80" />
            </div>
          )}

          <div className="flex items-center justify-between px-4">
            <h2 className="text-base font-bold">{uz.miniapp.bestSellers}</h2>
          </div>

          {catalog.items.length === 0 && (
            <p className="px-4 text-sm text-muted-foreground">{uz.miniapp.emptyCatalog}</p>
          )}

          <ul className="grid grid-cols-2 gap-3 px-4">
            {catalog.items.map((p) => {
              const qty = qtyOf(p.id);
              return (
                <li key={p.id} className="flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-card">
                  <div className="relative flex h-24 items-center justify-center rounded-xl bg-muted">
                    <UnitIcon unit={p.unit as UnitValue} iconClassName="size-10 text-primary" />
                    {p.promoPercent ? (
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        −{p.promoPercent}%
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-tight">{p.name}</p>
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold tabular-nums">{formatSum(p.salePrice)}</p>
                      <p className="text-[11px] text-muted-foreground">/ {uz.units[p.unit as keyof typeof uz.units]}</p>
                    </div>
                    {qty > 0 ? (
                      <div className="flex items-center gap-1 rounded-full bg-accent px-1 py-1">
                        <RoundButton disabled={busy} label="−" onClick={() => act({ op: "change", productId: p.id, delta: -1 })}>
                          <Minus className="size-3.5" />
                        </RoundButton>
                        <span className="min-w-5 text-center text-xs font-bold tabular-nums">
                          {formatQuantity(String(qty))}
                        </span>
                        <RoundButton disabled={busy} label="+" onClick={() => act({ op: "change", productId: p.id, delta: 1 })}>
                          <Plus className="size-3.5" />
                        </RoundButton>
                      </div>
                    ) : (
                      <RoundButton
                        disabled={busy}
                        label={uz.miniapp.addToCart}
                        filled
                        onClick={() => act({ op: "change", productId: p.id, delta: 1 })}
                      >
                        <Plus className="size-4" />
                      </RoundButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {catalog.pages > 1 && (
            <div className="flex items-center justify-between px-4 text-sm">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="rounded-xl bg-card px-3 py-2 shadow-card disabled:opacity-40"
              >
                {uz.miniapp.prev}
              </button>
              <span className="text-muted-foreground">
                {t(uz.miniapp.page, { page: page + 1, pages: catalog.pages })}
              </span>
              <button
                type="button"
                disabled={page >= catalog.pages - 1}
                onClick={() => setPage(page + 1)}
                className="rounded-xl bg-card px-3 py-2 shadow-card disabled:opacity-40"
              >
                {uz.miniapp.next}
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "cart" && (
        <section className="flex flex-col gap-4 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{uz.miniapp.tabCart}</h2>
            {cartCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => act({ op: "clear" })}
                aria-label={uz.miniapp.clearCart}
                className="flex size-10 items-center justify-center rounded-xl bg-card text-destructive shadow-card"
              >
                <Trash2 className="size-5" />
              </button>
            )}
          </div>

          {!cart || cart.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{uz.miniapp.cartEmpty}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <UnitIcon unit={i.unit as UnitValue} iconClassName="size-8 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-tight">{i.name}</p>
                      <p className="mt-1 text-sm font-bold tabular-nums">{formatSum(i.total)}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatQuantity(i.quantity)} {uz.units[i.unit as keyof typeof uz.units]} × {formatSum(i.price)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-full bg-accent px-1 py-1">
                      <RoundButton disabled={busy} label="+" onClick={() => act({ op: "change", productId: i.productId, delta: 1 })}>
                        <Plus className="size-3.5" />
                      </RoundButton>
                      <span className="text-xs font-bold tabular-nums">{formatQuantity(i.quantity)}</span>
                      <RoundButton disabled={busy} label="−" onClick={() => act({ op: "change", productId: i.productId, delta: -1 })}>
                        <Minus className="size-3.5" />
                      </RoundButton>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-card">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{uz.miniapp.subtotal}</span>
                  <span className="tabular-nums">{formatSum(cart.total)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>{uz.miniapp.total}</span>
                  <span className="tabular-nums text-primary">{formatSum(cart.total)}</span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">{uz.miniapp.priceNote}</p>

              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const r = await act({ op: "submit" });
                  if (r) {
                    setNotice(t(uz.miniapp.submitted, { number: r.number ?? "—" }));
                    setTab("orders");
                  }
                }}
                className="flex h-14 items-center justify-between rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-card transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <span>{busy ? uz.miniapp.submitting : uz.miniapp.submit}</span>
                <span className="tabular-nums">{formatSum(cart.total)}</span>
              </button>
            </>
          )}
        </section>
      )}

      {tab === "orders" && (
        <section className="flex flex-col gap-3 px-4">
          <h2 className="text-lg font-bold">{uz.miniapp.tabOrders}</h2>
          {orders.length === 0 && <p className="text-sm text-muted-foreground">{uz.miniapp.ordersEmpty}</p>}
          {orders.map((o, idx) => (
            <div key={`${o.number}-${idx}`} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-card">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {t(uz.miniapp.orderLine, {
                    number: o.number ?? "—",
                    date: o.submittedAt ? new Date(o.submittedAt).toLocaleDateString("uz-UZ") : "—",
                    total: formatSum(o.total),
                  })}
                </p>
                <p className="text-xs text-muted-foreground">{o.tenant.name}</p>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {uz.orders.statuses[o.status as keyof typeof uz.orders.statuses] ?? o.status}
              </span>
            </div>
          ))}
        </section>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md items-center justify-around border-t bg-card/95 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <NavButton icon={Home} label={uz.miniapp.tabCatalog} active={tab === "catalog"} onClick={() => setTab("catalog")} />
        <NavButton
          icon={ShoppingCart}
          label={uz.miniapp.tabCart}
          active={tab === "cart"}
          badge={cartCount}
          onClick={() => setTab("cart")}
        />
        <NavButton icon={ClipboardList} label={uz.miniapp.tabOrders} active={tab === "orders"} onClick={() => setTab("orders")} />
      </nav>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 bg-background pb-28">{children}</main>;
}

function Centered({ children }: { children: ReactNode }) {
  return <p className="px-6 py-16 text-center text-sm text-muted-foreground">{children}</p>;
}

function RoundButton({
  children,
  onClick,
  disabled,
  label,
  filled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
  filled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50",
        filled ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-card",
      )}
    >
      {children}
    </button>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 px-4 py-1 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className={cn("flex size-10 items-center justify-center rounded-xl", active && "bg-accent")}>
        <Icon className="size-5" />
      </span>
      {label}
      {badge ? (
        <span className="absolute top-0 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
