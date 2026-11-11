"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { t, uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { cn } from "@/lib/utils";

// Telegram Mini App ichidagi do'kon: katalog → savatcha → buyurtma. Ma'lumot faqat /api/miniapp orqali.
type TgWebApp = { initData: string; ready(): void; expand(): void };
declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

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

  if (initData === null) return <Shell>{uz.miniapp.loading}</Shell>;
  if (!initData) return <Shell>{uz.miniapp.openInTelegram}</Shell>;
  if (shops && shops.length === 0) return <Shell>{uz.miniapp.notRegistered}</Shell>;

  const shopName = shops?.find((s) => s.id === shopId)?.shop ?? "";

  return (
    <Shell>
      <header className="flex flex-col gap-2">
        <h1 className="text-lg font-bold">{shopName || uz.miniapp.title}</h1>
        {shops && shops.length > 1 && (
          <select
            aria-label={uz.miniapp.shopPick}
            className="h-10 rounded-xl border bg-card px-3 text-sm"
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
        )}
        <nav className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 text-sm">
          {(
            [
              ["catalog", uz.miniapp.tabCatalog],
              ["cart", `${uz.miniapp.tabCart} (${cartCount})`],
              ["orders", uz.miniapp.tabOrders],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg py-2 font-semibold transition-colors",
                tab === key ? "bg-card shadow-card" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          {notice}
        </p>
      )}

      {tab === "catalog" && catalog && (
        <section className="flex flex-col gap-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[{ id: "", name: uz.miniapp.allCategories }, ...catalog.categories].map((c) => (
              <button
                key={c.id || "all"}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  setPage(0);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium",
                  category === c.id ? "bg-foreground text-background" : "bg-card",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          {catalog.items.length === 0 && (
            <p className="text-sm text-muted-foreground">{uz.miniapp.emptyCatalog}</p>
          )}
          <ul className="flex flex-col gap-2">
            {catalog.items.map((p) => {
              const qty = qtyOf(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {formatSum(p.salePrice)} / {uz.units[p.unit as keyof typeof uz.units]}
                      {p.promoPercent ? (
                        <span className="ml-2 font-semibold text-primary">−{p.promoPercent}%</span>
                      ) : null}
                    </p>
                  </div>
                  {qty > 0 && (
                    <>
                      <Stepper disabled={busy} onClick={() => act({ op: "change", productId: p.id, delta: -1 })}>
                        −
                      </Stepper>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">
                        {formatQuantity(String(qty))}
                      </span>
                    </>
                  )}
                  <Stepper disabled={busy} onClick={() => act({ op: "change", productId: p.id, delta: 1 })}>
                    +
                  </Stepper>
                </li>
              );
            })}
          </ul>

          {catalog.pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                {uz.miniapp.prev}
              </Button>
              <span className="text-muted-foreground">
                {t(uz.miniapp.page, { page: page + 1, pages: catalog.pages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= catalog.pages - 1}
                onClick={() => setPage(page + 1)}
              >
                {uz.miniapp.next}
              </Button>
            </div>
          )}

          {cartCount > 0 && (
            <Button size="lg" className="sticky bottom-4 w-full shadow-card" onClick={() => setTab("cart")}>
              {uz.miniapp.tabCart} · {formatSum(cart?.total ?? 0)}
            </Button>
          )}
        </section>
      )}

      {tab === "cart" && (
        <section className="flex flex-col gap-3">
          {!cart || cart.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{uz.miniapp.cartEmpty}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatQuantity(i.quantity)} {uz.units[i.unit as keyof typeof uz.units]} × {formatSum(i.price)}
                      </p>
                    </div>
                    <Stepper disabled={busy} onClick={() => act({ op: "change", productId: i.productId, delta: -1 })}>
                      −
                    </Stepper>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">
                      {formatQuantity(i.quantity)}
                    </span>
                    <Stepper disabled={busy} onClick={() => act({ op: "change", productId: i.productId, delta: 1 })}>
                      +
                    </Stepper>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-base font-bold">
                <span>{uz.miniapp.total}</span>
                <span className="tabular-nums">{formatSum(cart.total)}</span>
              </div>
              <Button
                size="lg"
                disabled={busy}
                onClick={async () => {
                  const r = await act({ op: "submit" });
                  if (r) {
                    setNotice(t(uz.miniapp.submitted, { number: r.number ?? "—" }));
                    setTab("orders");
                  }
                }}
              >
                {busy ? uz.miniapp.submitting : uz.miniapp.submit}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => act({ op: "clear" })}>
                {uz.miniapp.clearCart}
              </Button>
            </>
          )}
        </section>
      )}

      {tab === "orders" && (
        <section className="flex flex-col gap-2">
          {orders.length === 0 && <p className="text-sm text-muted-foreground">{uz.miniapp.ordersEmpty}</p>}
          {orders.map((o, idx) => (
            <div key={`${o.number}-${idx}`} className="flex flex-col gap-1 rounded-2xl border bg-card p-3">
              <p className="text-sm font-semibold">
                {t(uz.miniapp.orderLine, {
                  number: o.number ?? "—",
                  date: o.submittedAt ? new Date(o.submittedAt).toLocaleDateString("uz-UZ") : "—",
                  total: formatSum(o.total),
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {uz.orders.statuses[o.status as keyof typeof uz.orders.statuses] ?? o.status} · {o.tenant.name}
              </p>
            </div>
          ))}
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-background p-4">
      {typeof children === "string" ? <p className="py-10 text-center text-sm text-muted-foreground">{children}</p> : children}
    </main>
  );
}

function Stepper({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}
