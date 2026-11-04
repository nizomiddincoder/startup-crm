/**
 * Birinchi platforma adminini yaratadi (server ishga tushganda, start-prod.mjs chaqiradi).
 * Muhit: ADMIN_PHONE, ADMIN_PASSWORD, ixtiyoriy ADMIN_NAME.
 * Admin allaqachon bo'lsa — hech narsa o'zgartirmaydi (parol qayta yozilmaydi).
 */
import { bootstrapPlatformAdmin } from "@/lib/services/admin";

async function main() {
  const result = await bootstrapPlatformAdmin({
    phone: process.env.ADMIN_PHONE ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
    name: process.env.ADMIN_NAME ?? "Platforma admini",
  });
  console.log(
    result === "created"
      ? "[admin] Platforma admini yaratildi. Endi ADMIN_PASSWORD o'zgaruvchisini o'chirib qo'yish mumkin."
      : result === "exists"
        ? "[admin] Platforma admini allaqachon bor — o'zgartirilmadi."
        : "[admin] ADMIN_PHONE yoki ADMIN_PASSWORD noto'g'ri (parol kamida 8 belgi).",
  );
  const { db } = await import("@/lib/db");
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
