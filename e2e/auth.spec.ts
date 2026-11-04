import { expect, test, type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";

// Seed'dagi demo foydalanuvchilar (prisma/seed.ts). Avval: npm run db:seed
const PASSWORD = "demo1234";

async function login(page: Page, phone: string, password = PASSWORD) {
  await page.goto("/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: uz.auth.login }).click();
}

test("login qilmagan foydalanuvchi kassaga kira olmaydi", async ({ page }) => {
  await page.goto("/pos");
  await expect(page).toHaveURL(/\/login/);
});

test("noto'g'ri parol xato ko'rsatadi", async ({ page }) => {
  // Tasodifiy raqam — haqiqiy xodim login cheklovi (5 urinish) ostiga tushib qolmasin
  await login(page, `97${String(Date.now()).slice(-7)}`, "notogri99");
  await expect(page.getByText(uz.auth.invalidCredentials)).toBeVisible();
});

test("kassir kassaga tushadi va panelga kira olmaydi", async ({ page }) => {
  await login(page, "903333333");
  await expect(page).toHaveURL(/\/pos$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/pos$/);
});

test("egasi panelga tushadi va chiqa oladi", async ({ page }) => {
  await login(page, "901111111");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(uz.roles.OWNER, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: uz.auth.logout }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("platforma admini admin panelga tushadi", async ({ page }) => {
  await login(page, "900000000");
  await expect(page).toHaveURL(/\/admin$/);
});
