import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageCustomers } from "@/lib/services/permissions";
import {
  listCustomers,
  getCustomer,
  searchCustomers,
  createCustomer,
  updateCustomer,
  receiveDebtPayment,
  payMasterBonus,
} from "@/lib/services/customers";

export async function GET(req: NextRequest) {
  const { tenantId, role } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const record = await getCustomer(tenantId, id);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...record });
  }
  const search = searchParams.get("search") ?? undefined;
  const debtorsOnly = searchParams.has("debtors") && searchParams.get("debtors") === "1";
  const mastersOnly = searchParams.has("masters") && searchParams.get("masters") === "1";
  const overdueOnly = searchParams.has("overdue") && searchParams.get("overdue") === "1";
  const { items, totalDebt, totalOverdue } = await listCustomers(tenantId, {
    search,
    debtorsOnly,
    mastersOnly,
    overdueOnly,
  });
  return NextResponse.json({ items, totalDebt, totalOverdue });
}

export async function POST(req: NextRequest) {
  const { tenantId, role, userId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const body = await req.json().catch(() => ({}));
  const scope = body?.scope;
  if (scope === "debt") {
    const { customerId, ...input } = body;
    if (typeof customerId !== "string" || customerId.length < 3) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
    }
    await receiveDebtPayment(tenantId, userId, customerId, input);
    return NextResponse.json({ ok: true });
  }
  if (scope === "bonus") {
    const { masterId, ...input } = body;
    if (typeof masterId !== "string" || masterId.length < 3) {
      return NextResponse.json({ error: "Invalid master id" }, { status: 400 });
    }
    if (!canManageCustomers(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await payMasterBonus(tenantId, userId, masterId, input);
    return NextResponse.json({ ok: true });
  }
  const customer = await createCustomer(tenantId, body, canManageCustomers(role));
  return NextResponse.json({ customer }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { tenantId, role } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const body = await req.json().catch(() => ({}));
  const { id, ...input } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
  }
  await updateCustomer(tenantId, id, input, canManageCustomers(role));
  return NextResponse.json({ ok: true });
}
