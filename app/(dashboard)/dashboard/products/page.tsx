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
import { formatSum } from "@/lib/services/money";
import { canManageProducts } from "@/lib/services/permissions";
import { listProducts } from "@/lib/services/products";

type SearchParams = Promise<{ q?: string; category?: string; archived?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", category = "", archived } = await searchParams;
  const user = await requireUser();
  const canManage = canManageProducts(user.role);
  const includeArchived = archived === "1";

  const [{ items, total }, categories] = await Promise.all([
    listProducts(user.tenantId, { search: q, categoryId: category || undefined, includeArchived }),
    listCategories(user.tenantId),
  ]);

  return (
    <main className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{uz.products.title}</h1>
        {canManage && (
          <Link href="/dashboard/products/new" className={buttonVariants()}>
            {uz.products.add}
          </Link>
        )}
      </div>

      {/* Oddiy GET forma: skaner shtrix-kodni yozib Enter bosganda qidiruv ishlaydi */}
      <form className="flex flex-wrap items-center gap-3">
        <Input
          name="q"
          defaultValue={q}
          placeholder={uz.products.searchPlaceholder}
          aria-label={uz.common.search}
          className="w-80"
          autoFocus
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
            name="archived"
            value="1"
            defaultChecked={includeArchived}
            className="size-4 accent-primary"
          />
          {uz.products.showArchived}
        </label>
        <Button type="submit" variant="outline">
          {uz.common.search}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {total} {uz.products.count}
      </p>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{uz.products.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.products.name}</TableHead>
                <TableHead>{uz.products.category}</TableHead>
                <TableHead className="text-right">{uz.products.salePrice}</TableHead>
                <TableHead className="text-right">{uz.products.costPrice}</TableHead>
                <TableHead>{uz.products.barcode}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} className={p.isActive ? undefined : "opacity-60"}>
                  <TableCell className="font-medium">
                    {canManage ? (
                      <Link href={`/dashboard/products/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    ) : (
                      p.name
                    )}
                    {!p.isActive && (
                      <Badge variant="secondary" className="ml-2">
                        {uz.products.archived}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.category?.name ?? uz.categories.none}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {formatSum(p.salePrice)}
                    <span className="text-muted-foreground"> / {uz.units[p.unit]}</span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
                    {p.costPrice === null ? "—" : formatSum(p.costPrice)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {p.barcode ?? "—"}
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
