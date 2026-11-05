/**
 * Filiallar (Branch): har birining o'z ombori va kassirlari bor.
 * Filiallararo ko'chirish — alohida, qayd etiladigan amal (StockTransfer + TRANSFER_OUT/IN).
 */
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { t, uz } from "@/lib/i18n/uz";
import { planLimits } from "@/lib/plans";
import { ServiceError } from "./errors";
import { formatQuantity } from "./format";
import { assertSubscriptionActive } from "./companies";
import { withTenant } from "@/lib/db-tenant";

export async function listBranches(tenantId: string) {
  return db.branch.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      isDefault: true,
      isActive: true,
      _count: { select: { users: true } },
    },
  });
}

export async function createBranch(tenantId: string, input: { name: string; address?: string }) {
  await assertSubscriptionActive(tenantId);
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new ServiceError(uz.branches.nameInvalid, "name");
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { addonBranches: true, plan: true },
  });
  if (!tenant) throw new ServiceError(uz.companies.notFound);
  const limits = planLimits(tenant);
  const count = await db.branch.count({ where: { tenantId, isActive: true } });
  if (count >= limits.branches) throw new ServiceError(t(uz.subscription.limitBranches, { limit: limits.branches }), "name");
  return db.branch.create({ data: { tenantId, name, address: input.address?.trim() || null } });
}

export async function updateBranch(
  tenantId: string,
  branchId: string,
  input: { name?: string; address?: string; isActive?: boolean },
) {
  const branch = await db.branch.findFirst({ where: { id: branchId, tenantId } });
  if (!branch) throw new ServiceError(uz.branches.notFound);
  const name = input.name?.trim();
  if (name !== undefined && (name.length < 2 || name.length > 60)) {
    throw new ServiceError(uz.branches.nameInvalid, "name");
  }
  // Asosiy filialni o'chirib bo'lmaydi
  if (input.isActive === false && branch.isDefault) throw new ServiceError(uz.branches.cannotDisableDefault);
  await db.branch.update({
    where: { id: branchId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

/** Filial bo'yicha qoldiq: sum(StockMovement.quantity) — tenant qoidasi bilan bir xil. */
async function branchBalances(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  tenantId: string,
  branchId: string,
  productIds: string[],
) {
  const rows = await tx.stockMovement.groupBy({
    by: ["productId"],
    where: { tenantId, branchId, productId: { in: productIds } },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId, new Decimal(r._sum.quantity?.toString() ?? "0")]));
}

/**
 * Tovarni filialdan filialga ko'chirish. withTenant() ichida — RLS majburiy:
 * boshqa kompaniya filialiga yozish bazaviy darajada imkonsiz.
 */
export async function transferStock(
  tenantId: string,
  userId: string,
  input: { fromBranchId: string; toBranchId: string; note?: string; items: { productId: string; quantity: string }[] },
) {
  await assertSubscriptionActive(tenantId);
  if (input.fromBranchId === input.toBranchId) throw new ServiceError(uz.branches.sameBranch, "toBranchId");
  const clean = input.items.filter((i) => i.productId && i.quantity?.trim());
  if (clean.length === 0) throw new ServiceError(uz.branches.emptyTransfer, "items");
  if (clean.length > 200) throw new ServiceError(uz.branches.tooManyItems, "items");

  return withTenant(tenantId, async (tx) => {
    const branches = await tx.branch.findMany({
      where: { tenantId, id: { in: [input.fromBranchId, input.toBranchId] }, isActive: true },
    });
    if (branches.length !== 2) throw new ServiceError(uz.branches.notFound, "fromBranchId");

    const products = await tx.product.findMany({
      where: { tenantId, id: { in: [...new Set(clean.map((i) => i.productId))], isActive: true } },
      select: { id: true, name: true, unit: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const quantities = new Map<string, Decimal>();
    for (const [index, item] of clean.entries()) {
      const product = byId.get(item.productId);
      if (!product) throw new ServiceError(uz.pos.productUnavailable, `items.${index}`);
      const quantity = new Decimal(item.quantity.replace(",", ".").replace(/\s/g, ""));
      if (!quantity.gt(0) || !quantity.isFinite()) {
        throw new ServiceError(uz.pos.invalidQuantity, `items.${index}`);
      }
      quantities.set(item.productId, (quantities.get(item.productId) ?? new Decimal(0)).plus(quantity));
    }

    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { allowNegativeStock: true },
    });
    if (!tenant.allowNegativeStock) {
      const balances = await branchBalances(tx, tenantId, input.fromBranchId, [...quantities.keys()]);
      for (const [productId, need] of quantities) {
        const stock = balances.get(productId) ?? new Decimal(0);
        if (need.gt(stock)) {
          throw new ServiceError(
            t(uz.settings.notEnoughStock, { name: byId.get(productId)!.name, stock: formatQuantity(stock.toString()) }),
            "items",
          );
        }
      }
    }

    const { lastTransferNumber } = await tx.tenant.update({
      where: { id: tenantId },
      data: { lastTransferNumber: { increment: 1 } },
      select: { lastTransferNumber: true },
    });

    const transfer = await tx.stockTransfer.create({
      data: {
        tenantId,
        number: lastTransferNumber,
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        note: input.note?.trim() || null,
        createdById: userId,
        items: {
          create: clean.map((item) => ({
            tenantId,
            productId: item.productId,
            quantity: item.quantity.replace(",", ".").replace(/\s/g, ""),
          })),
        },
      },
      select: { id: true, number: true },
    });

    for (const item of clean) {
      const qty = item.quantity.replace(",", ".").replace(/\s/g, "");
      await tx.stockMovement.create({
        data: { tenantId, productId: item.productId, type: "TRANSFER_OUT", quantity: new Decimal(qty).neg().toString(), branchId: input.fromBranchId, userId },
      });
      await tx.stockMovement.create({
        data: { tenantId, productId: item.productId, type: "TRANSFER_IN", quantity: qty, branchId: input.toBranchId, userId },
      });
    }

    return transfer;
  });
}
