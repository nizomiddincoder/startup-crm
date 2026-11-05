import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageProducts } from "@/lib/services/permissions";
import { listProducts, getProduct, createProduct, updateProduct, setProductActive } from "@/lib/services/products";
import { isUniqueViolation, ServiceError } from "@/lib/services/errors";

export async function GET(req: NextRequest) {
  const { tenantId, role } = await requireTenantScopedUser([ "OWNER", "MANAGER", "WAREHOUSE" ]);
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const archived = searchParams.has("archived");
  const id = searchParams.get("id");
  if (id) {
    const product = await getProduct(tenantId, id);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ product });
  }
  const { items, total } = await listProducts(tenantId, {
    search,
    categoryId: categoryId && categoryId !== "" ? categoryId : undefined,
    includeArchived: archived,
  });
  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const product = await createProduct(tenantId, body);
  return NextResponse.json({ product }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const { id, ...input } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  await updateProduct(tenantId, id, input);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { tenantId } = await requireTenantScopedUser([ "OWNER", "MANAGER" ]);
  const body = await req.json().catch(() => ({}));
  const { id, isActive } = body;
  if (typeof id !== "string" || id.length < 3) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  await setProductActive(tenantId, id, isActive ?? false);
  return NextResponse.json({ ok: true });
}
