import Link from "next/link";
import { uz } from "@/lib/i18n/uz";
import { leadFunnel, leadsBySource } from "@/lib/services/leads/leads";
import { LeadStatusBadge } from "./lead-status-badge";

/** /admin: arizalar voronkasi (holatlar bo'yicha) va manbalar bo'yicha natija. */
export async function LeadFunnel() {
  const [funnel, sources] = await Promise.all([leadFunnel(), leadsBySource()]);
  const t = uz.leads;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card"
        data-testid="lead-funnel"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-bold">{t.funnel}</h2>
          <Link href="/admin/leads" className="text-sm font-semibold text-primary hover:underline">
            {t.viewAll} ({funnel.total})
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {funnel.rows.map((r) => (
            <div key={r.status} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/admin/leads?status=${r.status}`}>
                  <LeadStatusBadge status={r.status} />
                </Link>
                <span className="tabular-nums">
                  <span className="text-muted-foreground">{t.current}: </span>
                  <span className="font-semibold">{r.current}</span>
                  <span className="text-muted-foreground"> · {t.reached}: </span>
                  <span className="font-semibold" data-testid={`funnel-${r.status}`}>
                    {r.reached} ({r.percent}%)
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${r.percent}%` }} />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <Link href="/admin/leads?status=LOST">
              <LeadStatusBadge status="LOST" />
            </Link>
            <span className="font-semibold tabular-nums">{funnel.lost}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t.funnelHint}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="font-bold">{t.bySource}</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <table className="text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">{t.channel}</th>
                <th className="py-1 text-right font-medium">{t.total}</th>
                <th className="py-1 text-right font-medium">{t.paid}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.label} className="border-t">
                  <td className="py-2">{s.label}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{s.total}</td>
                  <td className="py-2 text-right tabular-nums">
                    {s.paid}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({s.total ? Math.round((s.paid / s.total) * 100) : 0}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
