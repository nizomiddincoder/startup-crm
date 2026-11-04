import { redirect } from "next/navigation";
import { ProductForm } from "@/components/features/products/product-form";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { listCategories } from "@/lib/services/categories";
import { canManageProducts } from "@/lib/services/permissions";
import { createProductAction } from "../actions";

export default async function NewProductPage() {
  const user = await requireUser();
  if (!canManageProducts(user.role)) redirect("/dashboard/products");
  const categories = await listCategories(user.tenantId);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{uz.products.newTitle}</h1>
      <ProductForm
        action={createProductAction}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  );
}
