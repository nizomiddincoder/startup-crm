import type { LeadStatus } from "@prisma/client";
import { uz } from "@/lib/i18n/uz";
import { cn } from "@/lib/utils";

const tone: Record<LeadStatus, string> = {
  NEW: "bg-accent text-accent-foreground",
  CALLED: "bg-secondary text-secondary-foreground",
  VISIT_SET: "bg-secondary text-secondary-foreground",
  VISITED: "bg-secondary text-secondary-foreground",
  PILOT: "bg-warning text-warning-foreground",
  PAID: "bg-primary text-primary-foreground",
  LOST: "bg-destructive/10 text-destructive",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tone[status],
      )}
    >
      {uz.leads.statuses[status]}
    </span>
  );
}
