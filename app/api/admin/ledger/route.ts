import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageCustomers } from "@/lib/services/permissions";
import { listLedgerEntries, getAccountSummary } from "@/lib/services/ledger";

export async function GET(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  if (customerId && customerId !== "") {
    const entries = await listLedgerEntries(tenantId, customerId);
    const summary = await getAccountSummary(tenantId, customerId);
    return NextResponse.json({ entries, summary });
  }
  const summary = await getAccountSummary(tenantId, null);
  return NextResponse.json({ summary });
}
