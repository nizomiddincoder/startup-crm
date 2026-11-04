import Link from "next/link";
import { t, uz } from "@/lib/i18n/uz";
import { formatTime } from "@/lib/services/format";
import { cn } from "@/lib/utils";

export type OpenShiftInfo = { number: number; openedAt: string };

/** Kassa tepasida smena holati: ochiq — vaqti bilan, yopiq — ochish havolasi. */
export function ShiftChip({ shift }: { shift: OpenShiftInfo | null }) {
  return (
    <Link
      href="/pos/shifts"
      data-testid="shift-chip"
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
        shift ? "bg-accent text-accent-foreground" : "bg-warning text-warning-foreground",
      )}
    >
      {shift
        ? `${uz.shifts.openShort} · ${t(uz.shifts.since, { time: formatTime(new Date(shift.openedAt)) })}`
        : `${uz.shifts.closedShort} — ${uz.shifts.open}`}
    </Link>
  );
}
