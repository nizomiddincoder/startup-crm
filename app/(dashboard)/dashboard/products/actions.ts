"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { forbiddenState, formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { canManageProducts } from "@/lib/services/permissions";

// Rasm servisi (sharp — native kutubxona) faqat kerak bo'lganda yuklanadi: aks holda butun
// actions moduli (mahsulot formasi ham) sharp yuklanishiga bog'liq bo'lib qoladi
const images = () => import("@/lib/services/product-images");
import { createProduct, setProductActive, updateProduct } from "@/lib/services/products";
import type { ProductInput } from "@/lib/validation/product";

async function requireManager() {
  const user = await requireUser();
  return canManageProducts(user.role) ? user : null;
}

function toInput(values: Record<string, string>): ProductInput {
  return {
    name: values.name ?? "",
    categoryId: values.categoryId,
    unit: (values.unit ?? "") as ProductInput["unit"],
    salePrice: values.salePrice,
    costPrice: values.costPrice,
    barcode: values.barcode,
    minStock: values.minStock,
  };
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const values = formValues(formData);
  let id: string;
  try {
    id = (await createProduct(user.tenantId, toInput(values))).id;
  } catch (error) {
    return toActionState(error, values);
  }
  // Rasm yo'q — AI yoqilgan bo'lsa nomidan yaratadi (javobni kutmaydi, fonda)
  const tenantId = user.tenantId;
  const { aiAvailability, generateProductImage } = await images();
  if ((await aiAvailability(tenantId)).left > 0) {
    after(() => generateProductImage(tenantId, id).catch(() => {}));
  }
  revalidatePath("/dashboard/products");
  redirect(`/dashboard/products/${id}`);
}

/** Rasm yuklash; AI yoqilgan bo'lsa — fonda bir xil uslubga keltiriladi. */
export async function uploadProductImageAction(
  productId: string,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const file = formData.get("image");
  if (!(file instanceof File)) return { fieldErrors: { image: uz.images.empty } };
  const { aiAvailability, standardizeProductImage, uploadProductImage } = await images();
  try {
    await uploadProductImage(user.tenantId, productId, {
      bytes: Buffer.from(await file.arrayBuffer()),
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    return toActionState(error);
  }
  const tenantId = user.tenantId;
  if (formData.get("standardize") === "on" && (await aiAvailability(tenantId)).left > 0) {
    after(() => standardizeProductImage(tenantId, productId).catch(() => {}));
  }
  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true };
}

export async function productImageAiAction(
  productId: string,
  mode: "generate" | "standardize",
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const { generateProductImage, standardizeProductImage } = await images();
  try {
    if (mode === "generate") await generateProductImage(user.tenantId, productId);
    else await standardizeProductImage(user.tenantId, productId);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true };
}

export async function removeProductImageAction(productId: string): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const { removeProductImages } = await images();
  try {
    await removeProductImages(user.tenantId, productId);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true };
}

export async function updateProductAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  const values = formValues(formData);
  try {
    await updateProduct(user.tenantId, id, toInput(values));
  } catch (error) {
    return toActionState(error, values);
  }
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function setProductActiveAction(id: string, isActive: boolean): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return forbiddenState;
  try {
    await setProductActive(user.tenantId, id, isActive);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
  return { ok: true };
}
