import { type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";

// Seed'dagi demo foydalanuvchilar (prisma/seed.ts). Avval: npm run db:seed
export const DEMO_PASSWORD = "demo1234";
export const DEMO_PIN = "1234";
/** Demo kassir telefoni — kirish PIN bilan bo'ladi */
export const CASHIER_PHONE = "903333333";

/** Kassir: PIN klaviaturasidan 4 ta raqam terib, ✓ bosadi. */
export async function pinLogin(page: Page, pin: string) {
  await page.goto("/login");
  for (const digit of pin) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
  await page.getByRole("button", { name: uz.auth.pinSubmit, exact: true }).click();
}

/** Admin (egasi, menejer, omborchi, platforma admini): "Admin kirish" → login/telefon + parol. */
export async function adminLogin(page: Page, identifier: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByRole("button", { name: uz.auth.adminLogin }).click();
  await page.locator("#identifier").fill(identifier);
  await page.locator("#password").fill(password);
  await page.locator("#password").press("Enter");
}

/** Demo kassir bo'lsa — PIN, aks holda admin kirishi. */
export async function login(page: Page, who: string, password = DEMO_PASSWORD) {
  if (who === CASHIER_PHONE) return pinLogin(page, DEMO_PIN);
  return adminLogin(page, who, password);
}
