import { auth, signOut } from "@/auth";
import { marketing } from "@/lib/i18n/marketing.uz";
import { uz } from "@/lib/i18n/uz";
import { assistantEnabled } from "@/lib/services/assistant";
import { revokeSession } from "@/lib/services/auth";
import { unreadNewsCount } from "@/lib/services/news";
import { moduleForPath } from "@/lib/modules";
import { tenantModules } from "@/lib/services/modules";
import { newOrdersCount } from "@/lib/services/orders";
import { isPlaceholder, telegramContactUrl } from "@/lib/site-config";
import {
  canAccessPath,
  canManageCustomers,
  canManageStaff,
  type Role,
} from "@/lib/services/permissions";
import { AppSidebar, type NavItem } from "./app-sidebar";

type Props = {
  user: { id: string; name: string; role: Role; tenantName: string; tenantId: string };
  children: React.ReactNode;
};

/** Rolga qarab menyu bandlari (ruxsatlar — permissions.ts). */
function navFor(role: Role, unreadNews: number, newOrders: number): NavItem[] {
  // Yangiliklar — barcha rollarda, o'qilmaganlar soni bilan
  const news: NavItem = {
    href: "/news",
    label: uz.news.nav,
    icon: "news",
    badge: unreadNews || undefined,
  };
  if (role === "SUPER_ADMIN") {
    return [
      { href: "/admin", label: uz.nav.shops, icon: "shops" },
      { href: "/admin/leads", label: uz.leads.nav, icon: "leads" },
      { href: "/admin/news", label: uz.news.adminTitle, icon: "news" },
      { href: "/admin/support", label: uz.support.adminNav, icon: "support" },
      { href: "/account", label: uz.account.nav, icon: "settings" },
    ];
  }

  const items: NavItem[] = [];
  const dashboard = canAccessPath(role, "/dashboard");
  const pos = canAccessPath(role, "/pos");
  if (dashboard) items.push({ href: "/dashboard", label: uz.nav.home, icon: "home" });
  if (pos) {
    items.push(
      { href: "/pos", label: uz.nav.pos, icon: "pos" },
      { href: "/pos/sales", label: uz.nav.sales, icon: "sales" },
      { href: "/pos/shifts", label: uz.nav.shifts, icon: "shifts" },
      { href: "/pos/estimates", label: uz.nav.estimates, icon: "estimates" },
      { href: "/pos/customers", label: uz.customers.title, icon: "customers" },
      {
        href: "/pos/orders",
        label: uz.orders.nav,
        icon: "orders",
        badge: newOrders || undefined,
      },
    );
  }
  if (canManageCustomers(role)) {
    items.push({ href: "/dashboard/marketing", label: uz.promotions.nav, icon: "marketing" });
  }
  if (dashboard) {
    items.push(
      { href: "/dashboard/products", label: uz.nav.products, icon: "products" },
      { href: "/dashboard/categories", label: uz.nav.categories, icon: "categories" },
      { href: "/dashboard/warehouse", label: uz.nav.warehouse, icon: "warehouse" },
    );
  }
  if (canManageStaff(role)) {
    items.push({ href: "/dashboard/staff", label: uz.nav.staff, icon: "staff" });
  }
  // Telegram: hisobot (egasi/menejer) va kirishni tasdiqlash sozlamasi — panelga kiradigan hamma
  if (dashboard) {
    items.push({ href: "/dashboard/telegram", label: uz.telegram.title, icon: "telegram" });
  }
  // Hisob sozlamalari (parolni o'zgartirish) — kassir PIN bilan kiradi, shuning uchun unda yo'q
  if (dashboard) items.push({ href: "/account", label: uz.account.nav, icon: "settings" });
  items.push(news);
  return items;
}

/** Barcha ichki sahifalar qobig'i: chapda menyu, o'ngda sahifa. */
export async function AppShell({ user, children }: Props) {
  const tenantUser = user.role !== "SUPER_ADMIN";
  const modules = tenantUser ? await tenantModules(user.tenantId) : null;
  const [unreadNews, newOrders] = tenantUser
    ? await Promise.all([
        unreadNewsCount(user.id),
        canAccessPath(user.role, "/pos") && modules?.has("orders")
          ? newOrdersCount(user.tenantId)
          : 0,
      ])
    : [0, 0];
  // Tarifda o'chirilgan modullar menyuda ko'rinmaydi
  const items = navFor(user.role, unreadNews, newOrders).filter((item) => {
    const needed = moduleForPath(item.href);
    return !needed || !modules || modules.has(needed);
  });
  async function logout() {
    "use server";
    // Avval serverda bekor qilamiz: fondagi so'rovlar eski cookie'ni qayta yozsa ham, u endi
    // qabul qilinmaydi (faqat cookie'ni o'chirish yetarli emas edi)
    const session = await auth();
    if (session?.user?.id) await revokeSession({ userId: session.user.id, sid: session.user.sid });
    await signOut({ redirectTo: "/login" });
  }

  // "Yordam" oynasidagi aloqa: brend telefoni (to'ldirilmagan bo'lsa — yo'q) va Telegram
  const support = {
    phone: isPlaceholder(marketing.footer.phone) ? null : marketing.footer.phone,
    telegramUrl: telegramContactUrl(),
    aiEnabled: assistantEnabled() && (!modules || modules.has("ai")),
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar
        items={items}
        user={user}
        logout={logout}
        support={support}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
