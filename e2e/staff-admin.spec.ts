import { expect, test } from "@playwright/test";
import { uz } from "../lib/i18n/uz";
import { login, pinLogin } from "./helpers";

const randomPhone = () => `95${String(Date.now()).slice(-7)}`;

test("egasi kassir qo'shadi va kassir PIN bilan kiradi", async ({ page }) => {
  const phone = randomPhone();
  await login(page, "901111111");
  await page.getByRole("link", { name: uz.nav.staff }).click();
  await page.getByLabel(uz.staff.name).fill(`E2E Kassir ${Date.now()}`);
  await page.getByLabel(uz.staff.phone).fill(phone);
  await page.getByLabel(uz.staff.role).selectOption("CASHIER");
  await page.getByRole("button", { name: uz.staff.add }).click();
  // Kassirga PIN beriladi (parol emas)
  const pin = (await page.getByTestId("new-pin").textContent())?.trim() ?? "";
  expect(pin).toMatch(/^\d{4}$/);

  await page.getByRole("button", { name: uz.auth.logout }).click();
  await page.waitForURL(/\/login/);
  await pinLogin(page, pin);
  await expect(page).toHaveURL(/\/pos$/);
});

test("platforma admini yangi do'kon yaratadi, egasi kiradi", async ({ page }) => {
  const ownerPhone = randomPhone();
  await login(page, "admin");
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByLabel(uz.admin.shopName).fill(`E2E Do'kon ${Date.now()}`);
  await page.getByLabel(uz.admin.ownerName).fill("E2E Egasi");
  await page.getByLabel(uz.admin.ownerPhone).fill(ownerPhone);
  await page.getByRole("button", { name: uz.admin.create }).click();
  const password = (await page.getByTestId("new-password").textContent())?.trim() ?? "";
  expect(password).toHaveLength(8);

  await page.getByRole("button", { name: uz.auth.logout }).click();
  await page.waitForURL(/\/login/);
  await login(page, ownerPhone, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: uz.nav.staff })).toBeVisible();
});

test("kassir xodimlar va admin sahifalariga kira olmaydi", async ({ page }) => {
  await login(page, "903333333");
  await expect(page.getByRole("link", { name: uz.nav.staff })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/pos$/);
});
