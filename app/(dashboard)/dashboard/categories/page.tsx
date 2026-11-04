import { CategoryCreateForm } from "@/components/features/categories/category-create-form";
import { CategoryRow } from "@/components/features/categories/category-row";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { listCategories } from "@/lib/services/categories";
import { canManageProducts } from "@/lib/services/permissions";

export default async function CategoriesPage() {
  const user = await requireUser();
  const canManage = canManageProducts(user.role);
  const categories = await listCategories(user.tenantId);

  return (
    <main className="flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{uz.categories.title}</h1>

      {canManage && <CategoryCreateForm />}

      {categories.length === 0 ? (
        <p className="text-muted-foreground">{uz.categories.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.categories.name}</TableHead>
                <TableHead className="text-right">{uz.categories.productsCount}</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={{ id: c.id, name: c.name, productCount: c._count.products }}
                  canManage={canManage}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
