import { Menu, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#imkoniyatlar", label: m.nav.features },
  { href: "/narxlar", label: m.nav.pricing },
  { href: "/savollar", label: m.nav.faq },
  { href: "/aloqa", label: m.nav.contact },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold" aria-label={m.brand}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ShoppingCart className="size-[18px]" />
      </span>
      <span className="text-lg tracking-tight">{m.brand}</span>
    </Link>
  );
}

/**
 * `cabinetHref` — tizimga kirgan foydalanuvchi uchun: "Kirish" / "Bepul sinash" o'rniga
 * "Kabinetga o'tish" tugmasi. Mobil menyu JavaScript'siz (<details>).
 */
export function SiteHeader({ cabinetHref }: { cabinetHref?: string }) {
  const actions = cabinetHref ? (
    <Link href={cabinetHref} className={buttonVariants()} data-testid="cabinet-link">
      {m.nav.cabinet}
    </Link>
  ) : (
    <>
      <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
        {m.nav.login}
      </Link>
      <Link href="/register" className={buttonVariants()}>
        {m.nav.trial}
      </Link>
    </>
  );

  return (
    // Xiralashtirish (backdrop-blur) yo'q — telefonda har aylantirishda qayta chiziladi (sekin)
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <nav
          className="hidden items-center gap-6 text-sm font-medium md:flex"
          aria-label={m.nav.menu}
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">{actions}</div>

        {/* Mobil: asosiy tugma doim ko'rinadi, qolgani menyuda */}
        <div className="flex items-center gap-2 md:hidden">
          {cabinetHref ? (
            actions
          ) : (
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              {m.nav.trial}
            </Link>
          )}
          <details className="group relative">
            <summary
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "list-none [&::-webkit-details-marker]:hidden",
              )}
              aria-label={m.nav.menu}
            >
              <Menu className="size-5" />
            </summary>
            <div className="absolute right-0 mt-2 flex w-56 flex-col gap-1 rounded-2xl border bg-card p-2 shadow-lg">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  {l.label}
                </a>
              ))}
              {!cabinetHref && (
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  {m.nav.login}
                </Link>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
