import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Tenant izolyatsiyasi bazaviy darajada (PostgreSQL RLS):
 * tranzaksiya ichida `app.tenant_id` sozlanadi va rol `kassa_app`'ga o'tadi —
 * RLS siyosati boshqa kompaniya qatorlarini KO'RISH ham, YOZISH ham imkonsiz qiladi.
 *
 * Odatiy Prisma ulanishi (jadval egasi) RLS'dan tashqarida — eski oqimlar buzilmaydi;
 * servis qatlami o'z navbatida har so'rovni tenantId bilan filtrlab turadi (ikki qatlam).
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
    await tx.$executeRawUnsafe(`SET LOCAL ROLE kassa_app`);
    return fn(tx);
  });
}
