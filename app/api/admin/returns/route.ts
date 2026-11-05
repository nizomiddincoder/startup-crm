import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageProducts } from "@/lib/services/permissions";
import { listSaleReturns, getSaleReturn, createReturn } from "@/lib/services/returns";

export async function GET(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") ?? undefined;
  const returns = await listSaleReturns(tenantId, branchId);
  return NextResponse.json({ returns });
}

export async function POST(req: NextRequest) {
  const { tenantId, role, userId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const ret = await createReturn(tenantId, userId, body);
  return NextResponse.json({ ...ret }, { status: 201 });
}
