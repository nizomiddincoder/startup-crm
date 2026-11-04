import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadEditForm } from "@/components/features/admin/lead-edit-form";
import { LeadStatusBadge } from "@/components/features/admin/lead-status-badge";
import { PageHeader } from "@/components/features/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { formatDateTime } from "@/lib/services/format";
import { sourceLabel } from "@/lib/services/leads/attribution";
import { getLead } from "@/lib/services/leads/leads";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  const t = uz.leads;

  const rows: [string, React.ReactNode][] = [
    [
      t.phone,
      <a key="p" href={`tel:${lead.phone}`} className="font-mono text-primary">
        {lead.phone}
      </a>,
    ],
    [t.city, t.cities[lead.city]],
    [t.shop, lead.shopName ?? "—"],
    [t.channel, sourceLabel(lead) ?? t.direct],
    ["keyword", lead.keyword ?? "—"],
    [t.form, t.sources[lead.source as keyof typeof t.sources] ?? lead.source],
    [t.message, lead.message ?? "—"],
    [t.consentAt, lead.consentAt ? formatDateTime(lead.consentAt) : "—"],
    [t.createdAt, formatDateTime(lead.createdAt)],
  ];

  return (
    <main className="flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={lead.name}
        eyebrow={t.title}
        actions={<LeadStatusBadge status={lead.status} />}
      />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl border bg-card p-5 text-sm shadow-card">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <LeadEditForm
        id={lead.id}
        defaults={{
          status: lead.status,
          lostReason: lead.lostReason ?? "",
          note: lead.note ?? "",
          assignee: lead.assignee ?? "",
        }}
      />
      <Link href="/admin/leads" className="text-sm font-semibold text-primary hover:underline">
        ← {t.back}
      </Link>
    </main>
  );
}
