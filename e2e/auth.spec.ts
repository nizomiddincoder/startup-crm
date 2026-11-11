import { expect, test } from "@playwright/test";
import { uz } from "../lib/i18n/uz";
import { adminLogin, login, pinLogin } from "./helpers";

test("login qilmagan foydalanuvchi kassaga kira olmaydi", async ({ page }) => {
  await page.goto("/pos");
  await expect(page).toHaveURL(/\/login/);
});

test("login sahifasi: PIN klaviatura ko'rinadi, admin kirish yashirin", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("pin-dots")).toBeVisible();
  await expect(page.getByRole("button", { name: "5", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: uz.auth.adminLogin })).toBeVisible();
  await expect(page.locator("#identifier")).toHaveCount(0);
});

test("noto'g'ri parol xato ko'rsatadi", async ({ page }) => {
  // Tasodifiy login — haqiqiy foydalanuvchi login cheklovi ostiga tushib qolmasin
  await adminLogin(page, `e2e${String(Date.now()).slice(-7)}`, "notogri99");
  await expect(page.getByText(uz.auth.invalidCredentials)).toBeVisible();
});

test("noto'g'ri PIN xato ko'rsatadi", async ({ page }) => {
  await pinLogin(page, "0000");
  await expect(page.getByText(uz.auth.invalidPin)).toBeVisible();
});

test("kassir PIN bilan kassaga tushadi va panelga kira olmaydi", async ({ page }) => {
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

test("platforma admini login (admin) bilan admin panelga tushadi", async ({ page }) => {
  await login(page, "admin");
  await expect(page).toHaveURL(/\/admin$/);
});
