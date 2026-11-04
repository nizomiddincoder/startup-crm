"use server";

import { revalidatePath } from "next/cache";
import { formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { createTenantWithOwner, setTenantActive } from "@/lib/services/admin";

const requireAdmin = () => requireUser(["SUPER_ADMIN"]);

export type ShopActionState = ActionState & {
  created?: { shop: string; ownerName: string; phone: string; password: string };
};

export async function createShopAction(
  _prev: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  await requireAdmin();
  const values = formValues(formData);
  try {
    const { owner, password } = await createTenantWithOwner({
      shopName: values.shopName ?? "",
      address: values.address,
      shopPhone: values.shopPhone,
      ownerName: values.ownerName ?? "",
      ownerPhone: values.ownerPhone ?? "",
    });
    revalidatePath("/admin");
    return {
      ok: true,
      created: { shop: values.shopName ?? "", ownerName: owner.name, phone: owner.phone, password },
    };
  } catch (error) {
    return toActionState(error, values);
  }
}

export async function setTenantActiveAction(tenantId: string, isActive: boolean) {
  await requireAdmin();
  try {
    await setTenantActive(tenantId, isActive);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/admin");
  return { ok: true };
}
