/** Session yoki boshqa manbadan olingan tenantId ni xavfsiz qabul qilish hamda kirish cheklovlari. */

import { isSessionActive } from "@/lib/services/auth";
import { assertMembership, isBranchRestricted } from "./tenant";
import type { Role } from "./permissions";

export async function requireTenantScopedUser(
  allowedRoles?: readonly Role[],
): Promise<{ userId: string; tenantId: string; role: Role; branchId: string | null }> {
  const session = await import("@/auth").then((m) => m.auth());
  const user = session?.user;
  if (!user || typeof user.id !== "string" || !user.id) {
    throw new Error("Unauthorized");
  }
  const active = await isSessionActive({
    userId: user.id,
    tenantId: user.tenantId ?? "",
    loginAt: user.loginAt ?? 0,
    sid: user.sid ?? "",
  });
  if (!active) {
    throw new Error("Session not active");
  }
  const { tenantId, role } = user;
  if (typeof tenantId !== "string" || tenantId.length < 3) {
    throw new Error("Invalid tenant in session");
  }
  if (typeof role !== "string") {
    throw new Error("Invalid role in session");
  }
  const roleTyped = role as Role;
  if (allowedRoles && !allowedRoles.includes(roleTyped)) {
    throw new Error("Role not allowed");
  }
  const member = await assertMembership(user.id, tenantId, allowedRoles);
  return { userId: user.id, tenantId, role: member.role, branchId: member.branchId };
}

export function isBranchInScope(
  userRole: Role,
  userBranchId: string | null,
  targetBranchId: string | null,
): boolean {
  if (!isBranchRestricted(userRole)) return true;
  if (userBranchId === null && targetBranchId === null) return true;
  return userBranchId === targetBranchId;
}

export function assertBranchInScope(
  userRole: Role,
  userBranchId: string | null,
  targetBranchId: string | null,
): void {
  if (isBranchInScope(userRole, userBranchId, targetBranchId)) return;
  throw new Error("Branch not in scope");
}
