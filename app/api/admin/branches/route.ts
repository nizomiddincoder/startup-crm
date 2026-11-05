import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageBranches } from "@/lib/services/permissions";
import { listBranches, createBranch, updateBranch, setBranchActive } from "@/lib/services/branches";

export async function GET() {
  const { tenantId, role, branchId: currentBranchId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "CASHIER" ]);
  const branches = await listBranches(tenantId, role, currentBranchId);
  return NextResponse.json({ branches, currentBranchId });
}

export async function POST(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const branch = await createBranch(tenantId, body);
  return NextResponse.json({ branch }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const { id, ...input } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });
  }
  await updateBranch(tenantId, id, input);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const { id, isActive } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });
  }
  await setBranchActive(tenantId, id, isActive ?? false);
  return NextResponse.json({ ok: true });
}
