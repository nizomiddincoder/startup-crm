"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { hasModule } from "@/lib/services/modules";
import { uz } from "@/lib/i18n/uz";
import { canManageStock } from "@/lib/services/permissions";
import { searchProductsForPos } from "@/lib/services/products";
import {
  createInventory,
  createReceipt,
  createWriteOff,
  listProductsForCount,
} from "@/lib/services/stock";
import type { StockDocumentInput } from "@/lib/validation/stock";

export type StockDocKind = "receipt" | "write-off" | "inventory";

async function requireStockUser() {
  const user = await requireUser();
  if (!canManageStock(user.role) || !(await hasModule(user.tenantId, "warehouse"))) return null;
  return user;
}

export async function searchStockProductsAction(query: string) {
  const user = await requireStockUser();
  if (!user) return [];
  return searchProductsForPos(user.tenantId, String(query).slice(0, 100));
}

export async function loadCategoryForCountAction(categoryId: string) {
  const user = await requireStockUser();
  if (!user) return [];
  return listProductsForCount(user.tenantId, categoryId);
}

const creators = {
  receipt: createReceipt,
  "write-off": createWriteOff,
  inventory: createInventory,
} as const;

export async function createStockDocumentAction(
  kind: StockDocKind,
  input: StockDocumentInput,
): Promise<ActionState & { id?: string }> {
  const user = await requireStockUser();
  if (!user) return { error: uz.warehouse.readOnly };
  const create = creators[kind];
  if (!create) return { error: uz.validation.invalidChoice };
  try {
    const doc = await create(user.tenantId, user.id, input);
    revalidatePath("/dashboard/warehouse");
    return { ok: true, id: doc.id };
  } catch (error) {
    return toActionState(error);
  }
}
