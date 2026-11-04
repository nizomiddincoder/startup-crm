import { PageHeader } from "@/components/features/layout/page-header";
import { LeadFunnel } from "@/components/features/admin/lead-funnel";
import { ShopCreateForm } from "@/components/features/admin/shop-create-form";
import { TenantToggle } from "@/components/features/admin/tenant-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { listTenants } from "@/lib/services/admin";
import { formatDate, formatDateTime } from "@/lib/services/format";

// SaaS egasi (biz) uchun: do'konlar ro'yxati, yangi do'kon qo'shish, o'chirish/yoqish.
export default async function AdminPage() {
  await requireUser(["SUPER_ADMIN"]);
  const tenants = await listTenants();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title={uz.admin.title} eyebrow={uz.nav.admin} />
      <LeadFunnel />
      <ShopCreateForm />

      {tenants.length === 0 ? (
        <p className="text-muted-foreground">{uz.admin.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.admin.shopName}</TableHead>
                <TableHead>{uz.admin.owner}</TableHead>
                <TableHead className="text-right">{uz.admin.users}</TableHead>
                <TableHead className="text-right">{uz.admin.products}</TableHead>
                <TableHead className="text-right">{uz.admin.salesToday}</TableHead>
                <TableHead>{uz.admin.lastSale}</TableHead>
                <TableHead>{uz.admin.createdAt}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow
                  key={t.id}
                  data-testid="tenant-row"
                  className={t.isActive ? undefined : "opacity-60"}
                >
                  <TableCell className="font-medium">
                    {t.name}
                    {!t.isActive && (
                      <Badge variant="secondary" className="ml-2">
                        {uz.admin.disabled}
                      </Badge>
                    )}
                    {t.trialEndsAt && (
                      <Badge variant="outline" className="ml-2" data-testid="trial-badge">
                        {uz.admin.trialUntil.replace("{date}", formatDate(t.trialEndsAt))}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.owner ? (
                      <>
                        {t.owner.name}
                        <span className="block font-mono text-xs text-muted-foreground">
                          {t.owner.phone}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.users}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.products}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.salesToday}</TableCell>
                  <TableCell className="tabular-nums">
                    {t.lastSaleAt ? formatDateTime(t.lastSaleAt) : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDate(t.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <TenantToggle id={t.id} isActive={t.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
