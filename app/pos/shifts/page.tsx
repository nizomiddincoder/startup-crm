import { PageHeader } from "@/components/features/layout/page-header";
import { ShiftForm } from "@/components/features/pos/shift-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { t, uz } from "@/lib/i18n/uz";
import { formatDateTime, formatTime } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { canReceiveReports, SECTION_ACCESS } from "@/lib/services/permissions";
import { getOpenShift, listShifts, shiftSummary } from "@/lib/services/shifts";
import { cn } from "@/lib/utils";

function Difference({ expected, counted }: { expected: number; counted: number }) {
  const diff = counted - expected;
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        diff < 0 && "text-destructive",
        diff > 0 && "text-warning-foreground",
        diff === 0 && "text-primary",
      )}
    >
      {diff === 0
        ? uz.shifts.exact
        : `${diff < 0 ? uz.shifts.shortage : uz.shifts.surplus}: ${formatSum(Math.abs(diff))}`}
    </span>
  );
}

/**
 * Kassa smenasi: kassir o'z smenasini ochadi/yopadi; egasi va menejer barcha smenalarni
 * (kamomad yoki ortiqcha bilan) ko'radi.
 */
export default async function ShiftsPage() {
  const user = await requireUser(SECTION_ACCESS["/pos"]);
  const seesAll = canReceiveReports(user.role);
  const [open, shifts] = await Promise.all([
    getOpenShift(user.tenantId, user.id),
    listShifts(user.tenantId, seesAll ? undefined : user.id),
  ]);
  const summary = open ? await shiftSummary(open) : null;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title={uz.shifts.listTitle} />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="font-bold">
            {open
              ? `${uz.shifts.title} № ${open.number} · ${t(uz.shifts.since, { time: formatTime(open.openedAt) })}`
              : uz.shifts.open}
          </h2>
          <ShiftForm kind={open ? "close" : "open"} />
        </div>

        {open && summary && (
          <div
            className="flex flex-col gap-2 rounded-2xl border bg-card p-5 text-sm shadow-card"
            data-testid="shift-summary"
          >
            <Row label={uz.shifts.openingCash} value={open.openingCash} />
            <Row label={uz.shifts.cashSales} value={summary.cashSales} sign="+" />
            <Row label={uz.shifts.debtPayments} value={summary.debtPayments} sign="+" />
            <Row label={uz.shifts.bonusPayouts} value={summary.bonusPayouts} sign="−" />
            <Row label={uz.shifts.cashRefunds} value={summary.cashRefunds} sign="−" />
            <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold">
              <span>{uz.shifts.expected}</span>
              <span className="tabular-nums" data-testid="shift-expected">
                {formatSum(summary.expected)}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{uz.nav.shifts}</h2>
        {shifts.length === 0 ? (
          <p className="text-muted-foreground">{uz.shifts.empty}</p>
        ) : (
          <div className="rounded-2xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>{uz.shifts.cashier}</TableHead>
                  <TableHead>{uz.shifts.openedAt}</TableHead>
                  <TableHead>{uz.shifts.closedAt}</TableHead>
                  <TableHead className="text-right">{uz.shifts.expected}</TableHead>
                  <TableHead className="text-right">{uz.shifts.counted}</TableHead>
                  <TableHead className="text-right">{uz.shifts.difference}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.id} data-testid="shift-row">
                    <TableCell className="font-medium">{s.number}</TableCell>
                    <TableCell>{s.user.name}</TableCell>
                    <TableCell className="tabular-nums">{formatDateTime(s.openedAt)}</TableCell>
                    <TableCell className="tabular-nums">
                      {s.closedAt ? formatDateTime(s.closedAt) : uz.shifts.stillOpen}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.expectedCash !== null ? formatSum(s.expectedCash) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.countedCash !== null ? formatSum(s.countedCash) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.expectedCash !== null && s.countedCash !== null ? (
                        <Difference expected={s.expectedCash} counted={s.countedCash} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}

function Row({ label, value, sign }: { label: string; value: number; sign?: "+" | "−" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        {sign && value > 0 ? `${sign} ` : ""}
        {formatSum(value)}
      </span>
    </div>
  );
}
