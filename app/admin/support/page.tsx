import { PageHeader } from "@/components/features/layout/page-header";
import { SupportResolveButton } from "@/components/features/support/support-resolve-button";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { formatDateTime } from "@/lib/services/format";
import { listSupportRequests } from "@/lib/services/support";

/** Platforma admini: do'konlardan kelgan "Yordam" so'rovlari (ochiqlari tepada). */
export default async function SupportRequestsPage() {
  await requireUser(["SUPER_ADMIN"]);
  const requests = await listSupportRequests();

  return (
    <main className="flex flex-col gap-5 p-6">
      <PageHeader title={uz.support.adminTitle} />
      {requests.length === 0 ? (
        <p className="text-muted-foreground">{uz.support.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <article
              key={r.id}
              data-testid="support-row"
              className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={r.resolved ? "secondary" : "default"}>
                  {r.resolved ? uz.support.resolved : uz.support.open}
                </Badge>
                <span className="font-semibold">{r.tenant.name}</span>
                <span className="text-muted-foreground">
                  {r.user.name} ({uz.roles[r.user.role]}) · {r.user.phone} ·{" "}
                  {formatDateTime(r.createdAt)}
                </span>
                <SupportResolveButton id={r.id} resolved={r.resolved} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.message}</p>
              {(r.page || r.errorCode) && (
                <p className="font-mono text-xs text-muted-foreground">
                  {r.page}
                  {r.errorCode && ` · ${r.errorCode}`}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
