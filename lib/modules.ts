/**
 * MODULLAR — do'kon bo'yicha yoqiladigan bo'limlar.
 * Kassa (sotuv, qaytarish, smena), mahsulotlar, xodimlar, Telegram — har doim bor (asos).
 * Amaldagi modullar = tarif to'plami ∪ to'langan qo'shimchalar (ACTIVATED ModuleRequest)
 * − o'chirilganlar (Tenant.modulesOff). Prisma import qilinmaydi (klientda ham ishlaydi).
 */

/** Asosiy modullar (SaaS'dan oldingi tizimda borlari). */
export const CORE_MODULES = [
  "estimates", // smeta
  "warehouse", // ombor: kirim, chiqim, inventarizatsiya
  "customers", // mijozlar, nasiya, usta bonusi
  "marketing", // keshbek, aksiyalar, shaxsiy chegirma
  "orders", // Telegram'da buyurtma
  "ai", // AI rasm va AI yordamchi
] as const;

/** Kengaytma modullari (SaaS). Yangi modul qo'shish: shu ro'yxatga yozing — README'ga qarang. */
export const EXTENDED_MODULES = [
  "reports", // batafsil hisobotlar
  "price_tiers", // ulgurji narx darajalari
  "supplier_orders", // yetkazib beruvchi buyurtmalari
  "raw_materials", // xomashyo
  "recipes", // retseptlar (BOM)
  "production", // ishlab chiqarish buyurtmalari
  "appointments", // yozuvlar (xizmatlar uchun)
  "service_catalog", // xizmatlar katalogi
] as const;

export const MODULES = [...CORE_MODULES, ...EXTENDED_MODULES] as const;
export type ModuleId = (typeof MODULES)[number];
export type CoreModuleId = (typeof CORE_MODULES)[number];

/** Boshqa modulsiz ishlamaydiganlar: bog'liqlik hisobga olinadi. */
export const MODULE_REQUIRES: Partial<Record<ModuleId, ModuleId>> = {
  marketing: "customers",
  orders: "customers",
  recipes: "raw_materials",
  production: "raw_materials",
  supplier_orders: "warehouse",
  price_tiers: "customers",
};

/** Tarif bo'yicha sukut to'plami. Eski tariflar — asosiy modullar bilan. */
export const PLAN_MODULES: Record<string, readonly ModuleId[]> = {
  standard: ["estimates", "warehouse", "customers"],
  custom: CORE_MODULES,
  turnkey: CORE_MODULES,
  start: ["warehouse", "customers", "reports"],
  biznes: ["warehouse", "customers", "reports", "estimates", "marketing"],
  premium: [...CORE_MODULES, "reports", "price_tiers", "supplier_orders", "appointments", "service_catalog"],
  // "production", "raw_materials", "recipes" — faqat qo'shimcha to'lov bilan (ADDON_PRICES)
};

/** Biznes turi bo'yicha onboarding'da tanlanadigan sukut modullar. */
export const BUSINESS_TYPE_MODULES = {
  RETAIL: ["warehouse", "customers", "marketing", "reports"],
  WHOLESALE: ["warehouse", "reports", "price_tiers", "supplier_orders"],
  MANUFACTURER: ["warehouse", "reports", "raw_materials", "recipes", "production"],
  SERVICES: ["appointments", "service_catalog", "reports"],
} as const satisfies Record<string, readonly ModuleId[]>;

export type BusinessTypeId = keyof typeof BUSINESS_TYPE_MODULES;

export const BUSINESS_TYPE_IDS = Object.keys(BUSINESS_TYPE_MODULES) as BusinessTypeId[];

export function isBusinessTypeId(value: string): value is BusinessTypeId {
  return (BUSINESS_TYPE_IDS as string[]).includes(value);
}

/** Oyiga mijozlar soni oralig'i (onboarding savoli, ixtiyoriy). */
export const CUSTOMERS_RANGES = ["<500", "500-2000", "2000-10000", "10000+"] as const;

export function isPlanId(value: string): boolean {
  return value in PLAN_MODULES;
}

/**
 * Eski funksiya (asosiy modullar bilan ishlaydi): o'chirilganlar ro'yxatidan yoqiq modullar.
 * Yangi kodda effectiveModules() dan foydalaning.
 */
export function enabledModules(modulesOff: readonly string[]): Set<CoreModuleId> {
  const on = new Set<CoreModuleId>(CORE_MODULES.filter((m) => !modulesOff.includes(m)));
  return withDependencies(on);
}

/** To'liq hisob: tarif to'plami ∪ qo'shimcha modullar − o'chirilganlar. */
export function effectiveModules(input: {
  plan: string;
  modulesOff: readonly string[];
  extra: readonly string[];
}): Set<ModuleId> {
  const base = PLAN_MODULES[input.plan] ?? CORE_MODULES;
  const on = new Set<ModuleId>();
  for (const m of base) if (!input.modulesOff.includes(m)) on.add(m);
  for (const m of input.extra) {
    if (isModuleId(m) && !input.modulesOff.includes(m)) on.add(m);
  }
  return withDependencies(on);
}

function withDependencies(on: ReadonlySet<ModuleId>): Set<ModuleId> {
  const result = new Set(on);
  for (const [module, needs] of Object.entries(MODULE_REQUIRES)) {
    if (needs && !result.has(needs)) result.delete(module as ModuleId);
  }
  return result;
}

export function isModuleId(value: string): value is ModuleId {
  return (MODULES as readonly string[]).includes(value);
}

/** Yoqiq modullar ro'yxatidan bazaga yoziladigan "o'chirilganlar". Noma'lum nomlar tashlanadi. */
export function modulesOffFor(enabled: readonly string[]): CoreModuleId[] {
  return CORE_MODULES.filter((m) => !enabled.includes(m));
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
