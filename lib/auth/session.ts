import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isSessionActive } from "@/lib/services/auth";
import { homePathForRole, type Role } from "@/lib/services/permissions";

/**
 * Server sahifa/action'larda joriy foydalanuvchini oladi.
 * tenantId faqat shu yerdan (sessiyadan) olinadi — hech qachon formadan emas.
 *
 * Sessiya (JWT) 12 soat amal qiladi, shuning uchun har safar bazadan tekshiriladi:
 * xodim bloklangan, do'kon o'chirilgan yoki sessiya bekor qilingan (chiqish, yangi parol)
 * bo'lsa — darhol chiqarib yuboriladi (/logout).
 */
export async function requireUser(allowedRoles?: readonly Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id, tenantId, loginAt, sid } = session.user;
  if (!(await isSessionActive({ userId: id, tenantId, loginAt, sid }))) redirect("/logout");
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect(homePathForRole(session.user.role));
  }
  return session.user;
}
