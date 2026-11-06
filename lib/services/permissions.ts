/**
 * Rollar va ruxsatlar. Qaysi rol qaysi bo'limga kira olishi faqat shu yerda belgilanadi.
 * Bu fayl Edge muhitida (middleware) ham ishlaydi, shuning uchun Prisma import qilinmaydi.
 */
export const ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER", "WAREHOUSE"] as const;
export type Role = (typeof ROLES)[number];

/** Himoyalangan bo'limlar va ularga ruxsat etilgan rollar. */
export const SECTION_ACCESS = {
  "/admin": ["SUPER_ADMIN"],
  "/dashboard": ["OWNER", "MANAGER", "WAREHOUSE"],
  "/pos": ["OWNER", "MANAGER", "CASHIER"],
} as const satisfies Record<string, readonly Role[]>;

type Section = keyof typeof SECTION_ACCESS;

function findSection(pathname: string): Section | null {
  const sections = Object.keys(SECTION_ACCESS) as Section[];
  return sections.find((s) => pathname === s || pathname.startsWith(`${s}/`)) ?? null;
}

/** Yo'l himoyalanganmi (login talab qiladimi). */
export function isProtectedPath(pathname: string): boolean {
  return findSection(pathname) !== null;
}

/** Berilgan rol shu yo'lga kira oladimi. Himoyalanmagan yo'llar hammaga ochiq. */
export function canAccessPath(role: Role, pathname: string): boolean {
  const section = findSection(pathname);
  if (!section) return true;
  return (SECTION_ACCESS[section] as readonly Role[]).includes(role);
}

/** Mahsulot va kategoriyalarni qo'shish/o'zgartirish. Omborchi faqat ko'radi. */
export function canManageProducts(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** Usta belgisi, bonus foizi, nasiya limiti va bonus berish. Kassir faqat mijoz qo'shadi va qarz to'lovini oladi. */
export function canManageCustomers(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** Xodimlarni qo'shish, bloklash, parolni tiklash — faqat do'kon egasi. */
export function canManageStaff(role: Role): boolean {
  return role === "OWNER";
}

/** Telegram'da kunlik hisobot va nasiya xulosasini olish (egasi, menejer). */
export function canReceiveReports(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** Ombor hujjatlari (kirim, hisobdan chiqarish, inventarizatsiya). */
export function canManageStock(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER" || role === "WAREHOUSE";
}

/** Login qilgandan keyin har bir rol qayerga yo'naltiriladi. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "CASHIER":
      return "/pos";
    default:
      return "/dashboard";
  }
}

/** Kaspiy bilan ishlash: faqat kassa yoki menejer. */
export function canUsePos(role: Role): boolean {
  return (SECTION_ACCESS["/pos"] as readonly Role[]).includes(role);
}

/** Hisobotlarga kirish (standart dashboard hisobotlar). */
export function canViewReports(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** Saralash/jarayonlarni boshqarish (menejer uchun). */
export function canManageOperations(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** Modullarni o'chirmoqchi bo'lsa, faqat egasi. */
export function canManageModules(role: Role): boolean {
  return role === "OWNER";
}

/** Billing (obuna/sozlamalar). */
export function canManageBilling(role: Role): boolean {
  return role === "OWNER";
}

/** Xodimlarni Telegram orqali taklif qilish (Mini App). */
export function canInviteStaff(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** O'z qurilmasining PIN ni o'rnatish/yoki o'z qurilmasini o'chirish. */
export function canManageOwnDevice(role: Role): boolean {
  return true;
}

/** Biriktirilgan qurilmalarni boshqarish (egasi/menejer). */
export function canManageDevices(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** Filial qo'shish/yoki filialni o'chirish. */
export function canManageBranches(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

/** Kirish holati: active dialoqda kirish rejasini ko'rish. */
export function canManageSubscription(role: Role): boolean {
  return role === "OWNER";
}
