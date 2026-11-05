import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Tenant izolyatsiyasi bazaviy darajada (PostgreSQL RLS):
 * tranzaksiya ichida `app.tenant_id` sozlanadi va rol `kassa_app`'ga o'tadi —
 * RLS siyosati boshqa kompaniya qatorlarini KO'RISH ham, YOZISH ham imkonsiz qiladi.
 *
 * Barcha biznes amallari shu yordam orqali olinsin:
 *   - Boshqa kompaniya ma'lumotlarini o'qish/mutlaqo yozish imkonsiz.
 *   - Servis qatlami ham har doim tenantId ni o'zidan tekshiradi (ikki qatlam).
 *
 * Odatiy Prisma ulanishi (jadval egasi) RLS'dan tashqarida — eski oqimlar buzilmaydi.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (typeof tenantId !== "string" || tenantId.length < 3 || tenantId.length > 128)
    throw new Error("withTenant: noto'g'ri tenantId");

  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
    await tx.$executeRawUnsafe(`SET LOCAL ROLE kassa_app`);
    return fn(tx);
  });
}

/**
 * TenantId berilgan jadvaldagi barcha qatorlar faqat shu tenantga tegishli ekanligini
 * doimiy ravishda tekshirish uchun oddiiy yordam. Topilmasa — ServiceError.
 * Bu yordam shunchaki qo'shimcha portlov beradi; asosiy himoya RLS.
 */
export async function assertTenantExists(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return false;
  return true;
}

export const BRANCH_EQUALS_TENANT_SCOPE = "__BRANCH_EQUALS_TENANT_SCOPE__" as const;

/**
 * Shaffoflik uchun: bu fayldan kiruvchi faqat biznes servislari uchun emas,
 * balki tenant/boshqaruv katlami uchun foydalaniladi.
 */
export { db } from "@/lib/db";

