import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageStock } from "@/lib/services/permissions";
import { listCashShifts, openCashShift, closeCashShift } from "@/lib/services/shifts";

export async function GET(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") ?? undefined;
  const shifts = await listCashShifts(tenantId, branchId);
  return NextResponse.json({ shifts });
}

export async function POST(req: NextRequest) {
  const { tenantId, role, userId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "WAREHOUSE" ]);
  const body = await req.json().catch(() => ({}));
  const shift = await openCashShift(tenantId, userId, body);
  return NextResponse.json({ shift }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { tenantId, role, userId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "WAREHOUSE" ]);
  const body = await req.json().catch(() => ({}));
  const { id, ...input } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid shift id" }, { status: 400 });
  }
  const shift = await closeCashShift(tenantId, userId, id, input);
  return NextResponse.json({ shift });
}
