import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import {
  listSales,
  getSale,
  listEstimates,
  getEstimate,
  searchSalesForPos,
  searchEstimatesForPos,
} from "@/lib/services/sales";
import { canAccessPath } from "@/lib/services/permissions";

export async function GET(req: NextRequest) {
  const { tenantId, role } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const { searchParams } = new URL(req.url);
  const pos = searchParams.has("pos");
  if (pos) {
    const query = searchParams.get("q") ?? "";
    const sales = await searchSalesForPos(tenantId, query);
    const estimates = await searchEstimatesForPos(tenantId, query);
    return NextResponse.json({ sales, estimates });
  }
  const id = searchParams.get("id");
  if (id) {
    const doc = await getSale(tenantId, id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...doc });
  }
  const estimateId = searchParams.get("estimateId");
  if (estimateId) {
    const doc = await getEstimate(tenantId, estimateId);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...doc });
  }
  const branchId = searchParams.get("branchId") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sales = await listSales(tenantId, branchId, from, to);
  const estimates = await listEstimates(tenantId, branchId, from, to);
  return NextResponse.json({ sales, estimates });
}
