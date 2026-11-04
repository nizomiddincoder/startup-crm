import { notFound, redirect } from "next/navigation";
import { ArchiveButton } from "@/components/features/products/archive-button";
import { ProductForm } from "@/components/features/products/product-form";
import { ProductImageEditor } from "@/components/features/products/product-image-editor";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { listCategories } from "@/lib/services/categories";
import { formatQuantity } from "@/lib/services/format";
import { formatAmount } from "@/lib/services/money";
import { canManageProducts } from "@/lib/services/permissions";
import { aiAvailability, productImageInfo } from "@/lib/services/product-images";
import { getProduct } from "@/lib/services/products";
import { updateProductAction } from "../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!canManageProducts(user.role)) redirect("/dashboard/products");

  const [product, categories, images, ai] = await Promise.all([
    getProduct(user.tenantId, id),
    listCategories(user.tenantId),
    productImageInfo(user.tenantId, id),
    aiAvailability(user.tenantId),
  ]);
  if (!product) notFound();

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex max-w-xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{uz.products.editTitle}</h1>
          {!product.isActive && <Badge variant="secondary">{uz.products.archived}</Badge>}
        </div>
        <ArchiveButton id={product.id} isActive={product.isActive} />
      </div>
      <ProductImageEditor
        productId={product.id}
        imageVersion={product.imageVersion}
        original={images.original}
        standard={images.standard}
        ai={ai}
      />
      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        defaults={{
          name: product.name,
          categoryId: product.categoryId ?? "",
          unit: product.unit,
          salePrice: formatAmount(product.salePrice),
          costPrice: product.costPrice === null ? "" : formatAmount(product.costPrice),
          barcode: product.barcode ?? "",
          minStock: product.minStock ? formatQuantity(product.minStock) : "",
        }}
      />
    </main>
  );
}
