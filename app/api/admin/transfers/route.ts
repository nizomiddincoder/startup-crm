import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageStock } from "@/lib/services/permissions";
import { listStockTransfers, createStockTransfer } from "@/lib/services/branches";

export async function GET(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "WAREHOUSE" ]);
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") ?? undefined;
  const transfers = await listStockTransfers(tenantId, branchId);
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const { tenantId, role, userId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "WAREHOUSE" ]);
  const body = await req.json().catch(() => ({}));
  const transfer = await createStockTransfer(tenantId, userId, body);
  return NextResponse.json({ transfer }, { status: 201 });
}
