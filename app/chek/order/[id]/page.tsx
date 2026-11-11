import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/features/pos/auto-print";
import { OrderReceipt } from "@/components/features/pos/order-receipt";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { getOrder } from "@/lib/services/orders";
import { SECTION_ACCESS } from "@/lib/services/permissions";

export const metadata: Metadata = { title: uz.orderReceipt.title, robots: { index: false } };

/**
 * Buyurtma cheki (menyusiz). `?print=1` bo'lsa ochilishi bilan chop etadi.
 */
export default async function PrintOrderReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, { print }] = await Promise.all([params, searchParams]);
  const user = await requireUser(SECTION_ACCESS["/pos"]);
  const order = await getOrder(user.tenantId, id);
  if (!order) notFound();

  return (
    <main className="bg-card p-2 print:p-0">
      {/* Chek printeri (80 mm) uchun sahifa o'lchami */}
      <style>{`@page { size: 80mm auto; margin: 3mm; } body { background: white; }`}</style>
      <OrderReceipt order={order} shopName={user.tenantName ?? ""} className="border-0 shadow-none" />
      {print === "1" && <AutoPrint />}
    </main>
  );
}
