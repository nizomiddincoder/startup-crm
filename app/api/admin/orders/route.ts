import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageProducts } from "@/lib/services/permissions";
import { listOrders, getOrder, updateOrderStatus } from "@/lib/services/orders";

export async function GET(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const branchId = searchParams.get("branchId") ?? undefined;
  const orders = await listOrders(tenantId, status, branchId);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const { id, ...input } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }
  const order = await updateOrderStatus(tenantId, id, input);
  return NextResponse.json({ order });
}
