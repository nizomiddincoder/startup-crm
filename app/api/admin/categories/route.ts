import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageProducts } from "@/lib/services/permissions";
import { listCategories, createCategory, renameCategory, deleteCategory } from "@/lib/services/categories";

export async function GET() {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER", "WAREHOUSE" ]);
  const categories = await listCategories(tenantId);
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const category = await createCategory(tenantId, body);
  return NextResponse.json({ category }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const { id, ...input } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }
  await renameCategory(tenantId, id, input);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const id = body?.id;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }
  await deleteCategory(tenantId, id);
  return NextResponse.json({ ok: true });
}
