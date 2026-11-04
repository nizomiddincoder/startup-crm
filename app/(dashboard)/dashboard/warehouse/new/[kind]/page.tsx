import { notFound, redirect } from "next/navigation";
import { StockDocumentForm } from "@/components/features/warehouse/stock-document-form";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { listCategories } from "@/lib/services/categories";
import { canManageStock } from "@/lib/services/permissions";
import type { StockDocKind } from "../../actions";

const titles: Record<StockDocKind, string> = {
  receipt: uz.warehouse.receipt,
  "write-off": uz.warehouse.writeOff,
  inventory: uz.warehouse.inventory,
};

export default async function NewStockDocumentPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!(kind in titles)) notFound();
  const user = await requireUser();
  if (!canManageStock(user.role)) redirect("/dashboard/warehouse");
  const categories = await listCategories(user.tenantId);

  return (
    <main className="flex flex-col gap-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{titles[kind as StockDocKind]}</h1>
      <StockDocumentForm
        kind={kind as StockDocKind}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  );
}
