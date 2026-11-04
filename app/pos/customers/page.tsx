import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { listCustomers } from "@/lib/services/customers";
import { formatSum } from "@/lib/services/money";

type SearchParams = Promise<{ q?: string; debtors?: string; masters?: string; overdue?: string }>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", debtors, masters, overdue } = await searchParams;
  const user = await requireUser();
  const overdueOnly = overdue === "1";
  const { items, totalDebt, totalOverdue } = await listCustomers(user.tenantId, {
    search: q,
    debtorsOnly: debtors === "1",
    mastersOnly: masters === "1",
    overdueOnly,
  });

  return (
    <main className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{uz.customers.title}</h1>
          <p className="text-sm text-muted-foreground">
            {uz.customers.totalDebt}:{" "}
            <span className="font-medium text-foreground tabular-nums" data-testid="total-debt">
              {formatSum(totalDebt)}
            </span>
            {overdueOnly && (
              <>
                {" · "}
                {uz.customers.overdue}:{" "}
                <span
                  className="font-medium text-destructive tabular-nums"
                  data-testid="total-overdue"
                >
                  {formatSum(totalOverdue)}
                </span>
              </>
            )}
          </p>
        </div>
        <Link href="/pos/customers/new" className={buttonVariants()}>
          {uz.customers.add}
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <Input
          name="q"
          defaultValue={q}
          placeholder={uz.customers.searchPlaceholder}
          aria-label={uz.common.search}
          className="w-72"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="debtors"
            value="1"
            defaultChecked={debtors === "1"}
            className="size-4 accent-primary"
          />
          {uz.customers.debtorsOnly}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="masters"
            value="1"
            defaultChecked={masters === "1"}
            className="size-4 accent-primary"
          />
          {uz.customers.mastersOnly}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={overdueOnly}
            className="size-4 accent-primary"
          />
          {uz.customers.overdueOnly}
        </label>
        <Button type="submit" variant="outline">
          {uz.common.search}
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{uz.customers.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.customers.name}</TableHead>
                <TableHead>{uz.customers.phone}</TableHead>
                <TableHead className="text-right">{uz.customers.debt}</TableHead>
                {overdueOnly && (
                  <TableHead className="text-right">{uz.customers.overdue}</TableHead>
                )}
                <TableHead className="text-right">{uz.customers.bonus}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} data-testid="customer-row">
                  <TableCell className="font-medium">
                    <Link href={`/pos/customers/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                    {c.isMaster && (
                      <Badge variant="secondary" className="ml-2">
                        {uz.customers.master}
                        {c.bonusPercent && ` · ${c.bonusPercent.replace(".", ",")}%`}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                  <TableCell
                    className={
                      c.debt > 0
                        ? "text-right font-medium text-destructive tabular-nums"
                        : "text-right text-muted-foreground tabular-nums"
                    }
                  >
                    {c.debt > 0 ? formatSum(c.debt) : "—"}
                  </TableCell>
                  {overdueOnly && (
                    <TableCell className="text-right font-medium text-destructive tabular-nums">
                      {formatSum(c.overdue)}
                    </TableCell>
                  )}
                  <TableCell className="text-right tabular-nums">
                    {c.isMaster && c.bonus > 0 ? formatSum(c.bonus) : "—"}
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
