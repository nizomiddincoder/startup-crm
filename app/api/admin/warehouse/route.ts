import { NextRequest, NextResponse } from "next/server";
import { requireTenantScopedUser } from "@/lib/services/tenant-guard";
import { canManageStock } from "@/lib/services/permissions";
import {
  listStockBalances,
  listDocuments,
  getDocument,
  listStockMovements,
  createReceipt,
  createWriteOff,
  createInventory,
} from "@/lib/services/stock";

type StockDocumentType = "RECEIPT" | "WRITE_OFF" | "INVENTORY";

export async function GET(req: NextRequest) {
  const { tenantId, role } = await requireTenantScopedUser(["OWNER", "MANAGER", "WAREHOUSE"]);
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  if (kind === "balances") {
    const branchId = searchParams.get("branchId") ?? undefined;
    const balances = await listStockBalances(tenantId, role === "CASHIER" ? undefined : branchId);
    return NextResponse.json({ balances });
  }
  if (kind === "documents") {
    const type = searchParams.get("type") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;
    const resolvedType: StockDocumentType | undefined = type && ["RECEIPT", "WRITE_OFF", "INVENTORY"].includes(type)
      ? (type as StockDocumentType)
      : undefined;
    const documents = await listDocuments(tenantId, resolvedType, branchId);
    return NextResponse.json({ documents });
  }
  if (kind === "document") {
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    const document = await getDocument(tenantId, id);
    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ document });
  }
  if (kind === "movements") {
    const productId = searchParams.get("productId") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 500);
    const movements = await listStockMovements(tenantId, productId, branchId, limit);
    return NextResponse.json({ movements });
  }
  return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { tenantId, role, userId } = await requireTenantScopedUser(["OWNER", "MANAGER", "WAREHOUSE"]);
  const body = await req.json().catch(() => ({}));
  const type = body?.type;
  if (type === "RECEIPT") {
    const doc = await createReceipt(tenantId, userId, body);
    return NextResponse.json({ ...doc }, { status: 201 });
  }
  if (type === "WRITE_OFF") {
    const doc = await createWriteOff(tenantId, userId, body);
    return NextResponse.json({ ...doc }, { status: 201 });
  }
  if (type === "INVENTORY") {
    const doc = await createInventory(tenantId, userId, body);
    return NextResponse.json({ ...doc }, { status: 201 });
  }
  return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
}

