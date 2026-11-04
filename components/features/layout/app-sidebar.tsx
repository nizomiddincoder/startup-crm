"use client";

import {
  BadgePercent,
  Bell,
  Building2,
  ClipboardList,
  Clock,
  FileText,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Package,
  ReceiptText,
  Send,
  Settings,
  ShoppingCart,
  Tags,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpDialog, type SupportContacts } from "@/components/features/support/help-dialog";
import { uz } from "@/lib/i18n/uz";
import type { Role } from "@/lib/services/permissions";
import { cn } from "@/lib/utils";

const icons = {
  home: LayoutGrid,
  pos: ShoppingCart,
  sales: ReceiptText,
  shifts: Clock,
  estimates: FileText,
  customers: Users,
  products: Package,
  categories: Tags,
  warehouse: Warehouse,
  staff: UserCog,
  telegram: Send,
  shops: Building2,
  leads: Inbox,
  support: LifeBuoy,
  news: Bell,
  orders: ClipboardList,
  marketing: BadgePercent,
  settings: Settings,
};

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
  /** Qizil raqam (masalan, o'qilmagan yangiliklar) */
  badge?: number;
};

type Props = {
  items: NavItem[];
  user: { name: string; role: Role };
  logout: () => Promise<void>;
  support: SupportContacts;
};

/** Eng uzun mos keladigan havola faol hisoblanadi (/pos va /pos/sales ajraladi). */
function activeHref(items: NavItem[], pathname: string) {
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppSidebar({ items, user, logout, support }: Props) {
  const pathname = usePathname();
  const active = activeHref(items, pathname);

  return (
    <aside
      className="sticky top-0 z-20 scrollbar-none flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-sidebar px-2 py-2 md:h-screen md:w-[88px] md:flex-col md:overflow-y-auto md:border-r md:border-b-0 md:px-2 md:py-4 print:hidden"
      aria-label={uz.nav.menu}
    >
      <Link
        href={items[0]?.href ?? "/"}
        className="mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground md:mr-0 md:mb-2"
        aria-label={uz.app.name}
      >
        <ShoppingCart className="size-5" />
      </Link>

      <nav className="flex gap-1 md:w-full md:flex-1 md:flex-col md:gap-0.5">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const isActive = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-center text-[11px] leading-tight font-medium transition-colors md:w-full",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className={cn("size-5", isActive && "text-sidebar-primary")} />
                {item.badge ? (
                  <span
                    className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
                    data-testid={`badge-${item.icon}`}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:mt-4 md:ml-0 md:w-full md:flex-col">
        <HelpDialog contacts={support} />
        <div className="flex flex-col items-center gap-1 text-center" title={user.name}>
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials(user.name)}
          </span>
          <span className="hidden max-w-20 truncate text-[11px] text-muted-foreground md:block">
            {uz.roles[user.role]}
          </span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            aria-label={uz.auth.logout}
            title={uz.auth.logout}
            className="flex size-9 items-center justify-center rounded-xl text-sidebar-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
