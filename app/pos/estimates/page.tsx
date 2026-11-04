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
import { listEstimates } from "@/lib/services/estimates";
import { formatDateTime } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";

type SearchParams = Promise<{ q?: string; all?: string }>;

export default async function EstimatesPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", all } = await searchParams;
  const showAll = all === "1";
  const user = await requireUser();
  const estimates = await listEstimates(user.tenantId, {
    search: q,
    status: showAll ? undefined : "OPEN",
  });

  return (
    <main className="flex flex-col gap-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{uz.estimates.title}</h1>

      <form className="flex flex-wrap items-center gap-3">
        <Input
          name="q"
          defaultValue={q}
          placeholder={`${uz.estimates.number} / ${uz.estimates.customer}`}
          aria-label={uz.common.search}
          className="w-72"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="all"
            value="1"
            defaultChecked={showAll}
            className="size-4 accent-primary"
          />
          {uz.estimates.showAll}
        </label>
        <Button type="submit" variant="outline">
          {uz.common.search}
        </Button>
      </form>

      {estimates.length === 0 ? (
        <p className="text-muted-foreground">{uz.estimates.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.estimates.number}</TableHead>
                <TableHead>{uz.receipt.date}</TableHead>
                <TableHead>{uz.estimates.customer}</TableHead>
                <TableHead>{uz.estimates.status}</TableHead>
                <TableHead className="text-right">{uz.pos.total}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link href={`/pos/estimates/${e.id}`} className="font-medium hover:underline">
                      {e.number}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(e.createdAt)}</TableCell>
                  <TableCell>
                    {e.customerName ?? "—"}
                    {e.customerPhone && (
                      <span className="ml-2 text-muted-foreground">{e.customerPhone}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.status === "OPEN" ? "default" : "secondary"}>
                      {uz.estimates.statuses[e.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatSum(e.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === "OPEN" && (
                      <Link
                        href={`/pos?estimate=${e.id}`}
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        {uz.estimates.loadToPos}
                      </Link>
                    )}
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
