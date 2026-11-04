import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/features/pos/auto-print";
import { Receipt } from "@/components/features/pos/receipt";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { SECTION_ACCESS } from "@/lib/services/permissions";
import { getSale } from "@/lib/services/sales";

export const metadata: Metadata = { title: uz.receipt.title, robots: { index: false } };

/**
 * Faqat chek (menyusiz) — kassa uni yashirin oynada ochadi va printerga yuboradi.
 * `?print=1` bo'lsa ochilishi bilan chop etadi.
 */
export default async function PrintReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, { print }] = await Promise.all([params, searchParams]);
  const user = await requireUser(SECTION_ACCESS["/pos"]);
  const sale = await getSale(user.tenantId, id);
  if (!sale) notFound();

  return (
    <main className="bg-card p-2 print:p-0">
      {/* Chek printeri (80 mm) uchun sahifa o'lchami */}
      <style>{`@page { size: 80mm auto; margin: 3mm; } body { background: white; }`}</style>
      <Receipt sale={sale} className="border-0 shadow-none" />
      {print === "1" && <AutoPrint />}
    </main>
  );
}
