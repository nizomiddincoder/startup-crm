/**
 * MODULLAR — do'kon bo'yicha yoqiladigan bo'limlar (tarifga qarab, admin o'zgartiradi).
 * Kassa (sotuv, qaytarish, smena), mahsulotlar, xodimlar, Telegram — har doim bor (asos).
 * Bazada faqat O'CHIRILGANLAR saqlanadi (`Tenant.modulesOff`) — yangi modul qo'shilsa,
 * eski do'konlarda u yoqiq bo'ladi. Prisma import qilinmaydi (klientda ham ishlaydi).
 */
import type { PlanId } from "./pricing";

export const MODULES = [
  "estimates", // smeta
  "warehouse", // ombor: kirim, chiqim, inventarizatsiya
  "customers", // mijozlar, nasiya, usta bonusi
  "marketing", // keshbek, aksiyalar, shaxsiy chegirma
  "orders", // Telegram'da buyurtma
  "ai", // AI rasm va AI yordamchi
] as const;
export type ModuleId = (typeof MODULES)[number];

/** Boshqa modulsiz ishlamaydiganlar: marketing va buyurtma — mijozlar bazasiga tayanadi. */
export const MODULE_REQUIRES: Partial<Record<ModuleId, ModuleId>> = {
  marketing: "customers",
  orders: "customers",
};

/** Tarif bo'yicha sukut (admin tarifni tanlaganda shu to'plam qo'yiladi, keyin o'zgartirsa bo'ladi). */
export const PLAN_MODULES: Record<PlanId, readonly ModuleId[]> = {
  standard: ["estimates", "warehouse", "customers"],
  custom: MODULES,
  turnkey: MODULES,
};

export function isPlanId(value: string): value is PlanId {
  return value in PLAN_MODULES;
}

/** O'chirilganlar ro'yxatidan yoqiq modullar to'plami (bog'liqlik hisobga olinadi). */
export function enabledModules(modulesOff: readonly string[]): Set<ModuleId> {
  const on = new Set<ModuleId>(MODULES.filter((m) => !modulesOff.includes(m)));
  for (const [module, needs] of Object.entries(MODULE_REQUIRES)) {
    if (needs && !on.has(needs)) on.delete(module as ModuleId);
  }
  return on;
}

/** Yoqiq modullar ro'yxatidan bazaga yoziladigan "o'chirilganlar". Noma'lum nomlar tashlanadi. */
export function modulesOffFor(enabled: readonly string[]): ModuleId[] {
  return MODULES.filter((m) => !enabled.includes(m));
}

/** Sahifa yo'li qaysi modulga tegishli (menyu va himoya uchun). */
export const MODULE_PATHS: Record<string, ModuleId> = {
  "/pos/estimates": "estimates",
  "/dashboard/warehouse": "warehouse",
  "/pos/customers": "customers",
  "/dashboard/marketing": "marketing",
  "/pos/orders": "orders",
};

export function moduleForPath(pathname: string): ModuleId | null {
  for (const [prefix, module] of Object.entries(MODULE_PATHS)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return module;
  }
  return null;
}
