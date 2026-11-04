import type { LeadCity, LeadStatus } from "@prisma/client";
import { Download } from "lucide-react";
import Link from "next/link";
import { LeadStatusBadge } from "@/components/features/admin/lead-status-badge";
import { PageHeader } from "@/components/features/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
import { formatDateTime } from "@/lib/services/format";
import { sourceLabel } from "@/lib/services/leads/attribution";
import { listLeads } from "@/lib/services/leads/leads";
import { LEAD_CITIES, LEAD_STATUSES } from "@/lib/validation/lead";

type SearchParams = Promise<{ status?: string; city?: string }>;

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(["SUPER_ADMIN"]);
  const params = await searchParams;
  const status = pick<LeadStatus>(params.status, LEAD_STATUSES);
  const city = pick<LeadCity>(params.city, LEAD_CITIES);
  const leads = await listLeads({ status, city });

  const query = new URLSearchParams({ ...(status ? { status } : {}), ...(city ? { city } : {}) });
  const t = uz.leads;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={t.title}
        eyebrow={uz.nav.admin}
        description={`${leads.length} ${t.count}`}
        actions={
          <a
            href={`/admin/leads/export?${query}`}
            className={buttonVariants({ variant: "outline" })}
            data-testid="leads-export"
          >
            <Download className="size-4" />
            {t.exportCsv}
          </a>
        }
      />

      <form className="flex flex-wrap items-center gap-3">
        <NativeSelect name="status" defaultValue={status ?? ""} aria-label={t.status}>
          <NativeSelectOption value="">{t.allStatuses}</NativeSelectOption>
          {LEAD_STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {t.statuses[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect name="city" defaultValue={city ?? ""} aria-label={t.city}>
          <NativeSelectOption value="">{t.allCities}</NativeSelectOption>
          {LEAD_CITIES.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {t.cities[c]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          {t.filter}
        </Button>
      </form>

      {leads.length === 0 ? (
        <p className="text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.createdAt}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.city}</TableHead>
                <TableHead>{t.shop}</TableHead>
                <TableHead>{t.channel}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.assignee}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id} data-testid="lead-row">
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDateTime(l.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/admin/leads/${l.id}`} className="hover:underline">
                      {l.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <a href={`tel:${l.phone}`} className="font-mono text-sm hover:text-primary">
                      {l.phone}
                    </a>
                  </TableCell>
                  <TableCell>{t.cities[l.city]}</TableCell>
                  <TableCell className="text-muted-foreground">{l.shopName ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {sourceLabel(l) ?? t.direct}
                    <span className="block text-xs text-muted-foreground">
                      {t.sources[l.source as keyof typeof t.sources] ?? l.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.assignee ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
