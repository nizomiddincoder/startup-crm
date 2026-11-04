import { expect, test, type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";

async function login(page: Page, phone: string, password = "demo1234") {
  await page.goto("/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: uz.auth.login }).click();
  await page.waitForURL(/\/(dashboard|pos|admin)/);
}

const randomPhone = () => `95${String(Date.now()).slice(-7)}`;

test("egasi kassir qo'shadi va kassir shu parol bilan kiradi", async ({ page }) => {
  const phone = randomPhone();
  await login(page, "901111111");
  await page.getByRole("link", { name: uz.nav.staff }).click();
  await page.getByLabel(uz.staff.name).fill(`E2E Kassir ${Date.now()}`);
  await page.getByLabel(uz.staff.phone).fill(phone);
  await page.getByRole("button", { name: uz.staff.add }).click();
  const password = (await page.getByTestId("new-password").textContent())?.trim() ?? "";
  expect(password).toMatch(/^[a-z2-9]{8}$/);

  await page.getByRole("button", { name: uz.auth.logout }).click();
  await page.waitForURL(/\/login/);
  await login(page, phone, password);
  await expect(page).toHaveURL(/\/pos$/);
});

test("platforma admini yangi do'kon yaratadi, egasi kiradi", async ({ page }) => {
  const ownerPhone = randomPhone();
  await login(page, "900000000");
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
