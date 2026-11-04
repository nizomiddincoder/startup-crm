import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { categorySchema, type CategoryInput } from "@/lib/validation/product";
import { isUniqueViolation, ServiceError } from "./errors";

export async function listCategories(tenantId: string) {
  return db.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(tenantId: string, input: CategoryInput) {
  const data = categorySchema.parse(input);
  try {
    return await db.category.create({ data: { tenantId, name: data.name } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(uz.categories.duplicate, "name");
    throw error;
  }
}

export async function renameCategory(tenantId: string, id: string, input: CategoryInput) {
  const data = categorySchema.parse(input);
  try {
    const { count } = await db.category.updateMany({
      where: { id, tenantId },
      data: { name: data.name },
    });
    if (count === 0) throw new ServiceError(uz.categories.notFound);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(uz.categories.duplicate, "name");
    throw error;
  }
}

/** Faqat bo'sh kategoriyani o'chiradi — mahsulotlar "kategoriyasiz" qolib ketmasin. */
export async function deleteCategory(tenantId: string, id: string) {
  const productCount = await db.product.count({ where: { tenantId, categoryId: id } });
  if (productCount > 0) throw new ServiceError(uz.categories.notEmpty);
  await db.category.deleteMany({ where: { id, tenantId } });
}
