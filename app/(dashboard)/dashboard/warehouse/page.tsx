import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { listCategories } from "@/lib/services/categories";
import { formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { canManageStock } from "@/lib/services/permissions";
import { listStock } from "@/lib/services/stock";

type SearchParams = Promise<{ q?: string; category?: string; low?: string }>;

export default async function WarehousePage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", category = "", low } = await searchParams;
  const user = await requireUser();
  const canManage = canManageStock(user.role);
  const lowOnly = low === "1";

  const [{ items, totalValue }, categories] = await Promise.all([
    listStock(user.tenantId, { search: q, categoryId: category || undefined, lowOnly }),
    listCategories(user.tenantId),
  ]);

  return (
    <main className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{uz.warehouse.stockTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {uz.warehouse.totalValue}:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatSum(totalValue)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <>
              <Link href="/dashboard/warehouse/new/receipt" className={buttonVariants()}>
                {uz.warehouse.receipt}
              </Link>
              <Link
                href="/dashboard/warehouse/new/write-off"
                className={buttonVariants({ variant: "outline" })}
              >
                {uz.warehouse.writeOff}
              </Link>
              <Link
                href="/dashboard/warehouse/new/inventory"
                className={buttonVariants({ variant: "outline" })}
              >
                {uz.warehouse.inventory}
              </Link>
            </>
          )}
          <Link
            href="/dashboard/warehouse/documents"
            className={buttonVariants({ variant: "ghost" })}
          >
            {uz.warehouse.documents}
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <Input
          name="q"
          defaultValue={q}
          placeholder={uz.products.searchPlaceholder}
          aria-label={uz.common.search}
          className="w-80"
        />
        <NativeSelect name="category" defaultValue={category} aria-label={uz.products.category}>
          <NativeSelectOption value="">{uz.products.allCategories}</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="low"
            value="1"
            defaultChecked={lowOnly}
            className="size-4 accent-primary"
          />
          {uz.warehouse.lowOnly}
        </label>
        <Button type="submit" variant="outline">
          {uz.common.search}
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{uz.products.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.products.name}</TableHead>
                <TableHead>{uz.products.category}</TableHead>
                <TableHead className="text-right">{uz.warehouse.stock}</TableHead>
                <TableHead className="text-right">{uz.warehouse.minStock}</TableHead>
                <TableHead className="text-right">{uz.products.costPrice}</TableHead>
                <TableHead className="text-right">{uz.warehouse.stockValue}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} data-testid="stock-row">
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/warehouse/products/${p.id}`}
                      className="hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.negative ? (
                      <Badge variant="destructive" className="ml-2">
                        {uz.warehouse.negative}
                      </Badge>
                    ) : (
                      p.low && (
                        <Badge className="ml-2 bg-warning text-warning-foreground">
                          {uz.warehouse.low}
                        </Badge>
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.category ?? uz.categories.none}
                  </TableCell>
                  <TableCell
                    className={
                      p.negative
                        ? "text-right font-medium whitespace-nowrap text-destructive tabular-nums"
                        : "text-right font-medium whitespace-nowrap tabular-nums"
                    }
                  >
                    {formatQuantity(p.balance)} {uz.units[p.unit]}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
                    {p.minStock ? formatQuantity(p.minStock) : "—"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
                    {p.costPrice === null ? "—" : formatSum(p.costPrice)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {p.value ? formatSum(p.value) : "—"}
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
