// Ariza formasi ro'yxatlari. Alohida fayl (zod va matnlarsiz) — brauzerdagi forma shuni import
// qiladi, shunda sayt sahifalariga butun zod kutubxonasi yuklanmaydi (Lighthouse tezligi).

export const LEAD_CITIES = ["FERGANA", "ANDIJAN", "NAMANGAN", "OTHER"] as const;
export const LEAD_SOURCES = ["website", "self_signup", "pilot"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Ro'yxatdan o'tishda (self_signup) oferta va maxfiylik siyosatiga rozilik majburiy. */
export const CONSENT_REQUIRED_SOURCES: readonly LeadSource[] = ["self_signup"];
