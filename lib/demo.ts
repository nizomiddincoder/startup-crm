/**
 * Demo (sinov) foydalanuvchilar — prisma/seed.ts shulardan yaratadi.
 * Login sahifasi ularni FAQAT DEMO_MODE=1 bo'lganda ko'rsatadi (Kassa.bat / npm run app).
 * Internetdagi serverda DEMO_MODE yo'q va demo seed ishlamaydi.
 */
import type { Role } from "@prisma/client";

export const DEMO_PASSWORD = "demo1234";
/** Demo kassir PIN kodi (login sahifasidagi tez kirish uchun) */
export const DEMO_PIN = "1234";
export const PLATFORM_TENANT_ID = "platform";
export const DEMO_TENANT_ID = "demo-shop";

export const DEMO_USERS: {
  tenantId: string;
  name: string;
  phone: string;
  role: Role;
  /** Admin kirishi uchun login (faqat platforma admini) */
  login?: string;
}[] = [
  { tenantId: DEMO_TENANT_ID, name: "Akmal (egasi)", phone: "+998901111111", role: "OWNER" },
  { tenantId: DEMO_TENANT_ID, name: "Dilshod (menejer)", phone: "+998902222222", role: "MANAGER" },
  { tenantId: DEMO_TENANT_ID, name: "Nodira (kassir)", phone: "+998903333333", role: "CASHIER" },
  { tenantId: DEMO_TENANT_ID, name: "Bobur (omborchi)", phone: "+998904444444", role: "WAREHOUSE" },
  {
    tenantId: PLATFORM_TENANT_ID,
    name: "Platforma admini",
    phone: "+998900000000",
    role: "SUPER_ADMIN",
    login: "admin",
  },
];

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}
