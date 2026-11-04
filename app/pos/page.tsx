import { PosTerminal } from "@/components/features/pos/pos-terminal";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { listCategories } from "@/lib/services/categories";
import { getEstimateForPos } from "@/lib/services/estimates";
import { tenantModules } from "@/lib/services/modules";
import { orderForPos } from "@/lib/services/orders";
import { browseProductsForPos, topSellingProductsForPos } from "@/lib/services/products";
import { getOpenShift } from "@/lib/services/shifts";

type SearchParams = Promise<{ estimate?: string; order?: string }>;

export default async function PosPage({ searchParams }: { searchParams: SearchParams }) {
  const { estimate: estimateId, order: orderId } = await searchParams;
  const user = await requireUser();
  const modules = await tenantModules(user.tenantId);
  const [estimate, order, categories, products, topProducts, shift] = await Promise.all([
    estimateId && modules.has("estimates") ? getEstimateForPos(user.tenantId, estimateId) : null,
    orderId && !estimateId && modules.has("orders") ? orderForPos(user.tenantId, orderId) : null,
    listCategories(user.tenantId),
    browseProductsForPos(user.tenantId),
    topSellingProductsForPos(user.tenantId),
    getOpenShift(user.tenantId, user.id),
  ]);

  return (
    <main>
      {estimateId && !estimate && (
        <p className="mx-4 mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive md:mx-6">
          {uz.pos.estimateNotOpen}
        </p>
      )}
      {orderId && !estimateId && !order && (
        <p className="mx-4 mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive md:mx-6">
          {uz.orders.notOpen}
        </p>
      )}
      <PosTerminal
        // Savatchalar har foydalanuvchi uchun alohida saqlanadi
        storageKey={`pos-cart:${user.id}`}
        shopName={user.tenantName}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialProducts={products}
        topProducts={topProducts}
        shift={shift ? { number: shift.number, openedAt: shift.openedAt.toISOString() } : null}
        initialEstimate={
          estimate
            ? {
                id: estimate.id,
                number: estimate.number,
                discount: estimate.discount,
                lines: estimate.items.map((i) => ({
                  productId: i.productId,
                  name: i.name,
                  unit: i.unit,
                  price: i.price,
                  quantity: i.quantity,
                })),
              }
            : null
        }
        initialOrder={order}
        features={{ estimates: modules.has("estimates"), customers: modules.has("customers") }}
      />
    </main>
  );
}
