import { expect, test, type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill("demo1234");
  await page.getByRole("button", { name: uz.auth.login }).click();
  await page.waitForURL(/\/(dashboard|pos|admin)/);
}

test("egasi Telegram sahifasi: kod yoki havola yo'q — botda raqam yuboriladi", async ({ page }) => {
  await login(page, "901111111");
  await page.getByRole("link", { name: uz.telegram.title }).click();
  await expect(page.getByRole("heading", { name: uz.telegram.title })).toBeVisible();
  await expect(page.getByTestId("telegram-status")).toBeVisible();
  await expect(page.getByText(uz.telegram.howToLink)).toBeVisible();
  await expect(page.getByRole("button", { name: uz.telegram.getLink })).toHaveCount(0);
});

test("omborchi ham Telegram sahifasini ko'radi (kirishni tasdiqlash uchun), hisobotsiz", async ({
  page,
}) => {
  await login(page, "904444444");
  await page.getByRole("link", { name: uz.telegram.title }).click();
  await expect(page).toHaveURL(/\/dashboard\/telegram$/);
  await expect(page.getByText(uz.telegram.staffIntro)).toBeVisible();
  await expect(page.getByText(uz.telegram.customersHint)).toHaveCount(0);
});

test("Yordam: har rolda bor, muammo xabari yuboriladi va admin ko'radi", async ({ browser }) => {
  const text = `E2E muammo ${Date.now()}: chek chiqmayapti`;
  const cashier = await browser.newPage();
  await login(cashier, "903333333");
  await cashier.getByTestId("help-button").click();
  await cashier.getByLabel(uz.support.reportTitle).fill(text);
  await cashier.getByRole("button", { name: uz.support.send }).click();
  await expect(cashier.getByText(uz.support.sent)).toBeVisible();
  await cashier.close();

  const admin = await browser.newPage();
  await login(admin, "900000000");
  await admin.getByRole("link", { name: uz.support.adminNav }).click();
  const row = admin.getByTestId("support-row").filter({ hasText: text });
  await expect(row).toContainText("Demo Qurilish Mollari");
  await expect(row).toContainText("/pos");
  await row.getByRole("button", { name: uz.support.resolve }).click();
  await expect(row.getByRole("button", { name: uz.support.reopen })).toBeVisible();
  await admin.close();
});

test("mijoz kartasida Telegram orqali tasdiqlash bo'limi bor", async ({ page }) => {
  await login(page, "903333333");
  await page.goto("/pos/customers?q=Dilnoza");
  await page.getByRole("link", { name: "Dilnoza opa" }).click();
  await expect(page.getByTestId("customer-verify")).toBeVisible();
  await page
    .getByTestId("customer-verify")
    .getByRole("button", { name: uz.telegram.verifyShowQr })
    .click();
  // Lokal .env'da bot nomi bo'lmasa — tushunarli xabar; bo'lsa — QR va havola
  await expect(
    page.getByText(uz.telegram.verifyBotMissing).or(page.getByTestId("verify-link")),
  ).toBeVisible();
});
