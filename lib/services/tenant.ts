/** Sessiya orqali hozirgi tenant va filialni aniqlash, rollarni cheklash. */

import { type Role } from "./permissions";
import { BRANCH_EQUALS_TENANT_SCOPE } from "@/lib/db-tenant";

export type ScopedUser = {
  id: string;
  name: string;
  role: Role;
  tenantId: string;
  tenantName: string;
  phone: string;
  /** Menejer/yoki kassir uchun: faol filial id si (null — hammasi). */
  branchId: string | null;
};

export type TenantScope = {
  tenantId: string;
  /** Cashier/menejer uchun faol filial; hammasi uchun — null. */
  branchId: string | null;
  /** Super admin — tenantId yo'q, biznes jadvallari RLS'dan tashqarida. */
  superAdmin: boolean;
};

/** Sessiya orqali hozirgi tenant va filialni aniqlash, rollarni cheklash. */
export async function resolveUserSession(): Promise<ScopedUser | null> {
  const authMod = await import("@/auth");
  const session = await authMod.auth();
  const user = session?.user;
  if (!user || typeof user !== "object") return null;
  const uid = user.id;
  const roleRaw = user.role;
  const tenantId = user.tenantId;
  const tenantName = user.tenantName ?? "";
  const phone = user.phone;
  if (typeof uid !== "string" || uid.length < 3) return null;
  if (typeof roleRaw !== "string") return null;
  if (typeof tenantId !== "string" || tenantId.length < 3) return null;
  if (typeof phone !== "string") return null;
  const role = roleRaw as Role;
  const companiesMod = await import("@/lib/services/companies");
  const memberships = await companiesMod.listUserCompanies(uid);
  const current = memberships.find((m) => m.tenantId === tenantId);
  const branchId = current?.branchId ?? null;
  return {
    id: uid,
    name: user.name ?? uid,
    role,
    tenantId,
    tenantName: current?.name ?? tenantName,
    phone,
    branchId,
  };
}

/** Servis qatlamida ishlatiladigan, tenant + filial ob'hasi. */
export async function resolveTenantScope(): Promise<TenantScope | null> {
  const user = await resolveUserSession();
  if (!user) return null;
  if (user.role === "SUPER_ADMIN") {
    return { tenantId: "", branchId: null, superAdmin: true };
  }
  return {
    tenantId: user.tenantId,
    branchId: user.branchId,
    superAdmin: false,
  };
}

/** Foydalanuvchi shu tenantga tegishli a'zo ekanligini tekshirish. */
export async function assertMembership(
  userId: string,
  tenantId: string,
  allowedRoles?: readonly Role[],
): Promise<ScopedUser> {
  const companiesMod = await import("@/lib/services/companies");
  const memberships = await companiesMod.listUserCompanies(userId);
  const current = memberships.find((m) => m.tenantId === tenantId);
  if (!current) {
    throw new Error(`Membership not found for tenant ${tenantId}`);
  }
  if (allowedRoles && !allowedRoles.includes(current.role)) {
    throw new Error(`Role ${current.role} does not satisfy ${allowedRoles.join(",")}`);
  }
  return {
    id: userId,
    name: current.name,
    role: current.role,
    tenantId,
    tenantName: current.name,
    phone: "",
    branchId: current.branchId,
  };
}

/** Kassa yoki filialga bog'liq bo'lmagan branslarga kirish cheklanishi (kassa user faqat o'z filialini ko'rsin). */
export function isBranchRestricted(role: Role): boolean {
  return role === "CASHIER" || role === "MANAGER";
}

/** Cashier/menejer faqat o'z filialidagi ma'lumotlarga kirishi kerak. */
export function assertSameBranch(
  user: ScopedUser,
  targetBranchId: string | null,
): void {
  if (!isBranchRestricted(user.role)) return;
  if (user.branchId === null && targetBranchId === null) return;
  if (user.branchId === targetBranchId) return;
  throw new Error("Access to this branch is not allowed for current cashier/manager");
}

/** Filial ro'yxatidan faqat shu tenantga tegishli filiallarni ajratib olish (RLS yordamida ham amalga oshirilishi mumkin). */
export function filterBranchesForUser(
  user: ScopedUser,
  branches: Array<{ id: string; tenantId: string; name: string; isDefault: boolean; isActive: boolean }>,
): Array<{ id: string; tenantId: string; name: string; isDefault: boolean; isActive: boolean }> {
  if (user.role === "SUPER_ADMIN") return branches;
  const tenant = user.tenantId;
  const branchScoped = branches.filter((b) => b.tenantId === tenant && b.isActive);
  if (isBranchRestricted(user.role) && user.branchId) {
    return branchScoped.filter((b) => b.id === user.branchId);
  }
  return branchScoped;
}

/** Filial yo'naltirish uchun filial tanlovlaridan foydalanish (owner/menejer uchun ko'proq filial). */
export function branchesForPicker(user: ScopedUser): Array<{ value: string; label: string }> {
  const all = filterBranchesForUser(user, []);
  return all.map((b) => ({ value: b.id, label: b.name }));
}

/** Branslarga kirish ruxsati: faqat OWNER yoki MANAGER (faqat o'z filiallari, agar boshqa bo'lsa). */
export function canManageBranches(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}
