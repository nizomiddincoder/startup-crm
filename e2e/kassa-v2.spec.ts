import { expect, test, type Page } from "@playwright/test";
import { t, uz } from "../lib/i18n/uz";

// Seed: Sement M400 — 4780000000011, 62 000 so'm / qop; Gipsokarton — 4780000000059, 68 000 / list.
const CEMENT = "4780000000011";
const DRYWALL = "4780000000059";

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill("demo1234");
  await page.getByRole("button", { name: uz.auth.login }).click();
  await page.waitForURL(/\/(dashboard|pos|admin)/);
}

async function scan(page: Page, code: string) {
  const search = page.getByLabel(uz.pos.searchPlaceholder);
  await search.fill(code);
  await search.press("Enter");
  await expect(search).toHaveValue("");
}

test("navbat: ikkinchi mijozga alohida savatcha, to'langani yopiladi", async ({ page }) => {
  await login(page, "903333333");
  await page.waitForLoadState("networkidle");
  await scan(page, CEMENT);
  await expect(page.getByTestId("cart-line")).toHaveCount(1);

  // Birinchi mijoz o'ylanyapti — ikkinchisiga yangi kassa
  await page.getByRole("button", { name: uz.pos.newCustomerTab }).click();
  await expect(page.getByTestId("cart-tab")).toHaveCount(2);
  await expect(page.getByText(uz.pos.cartEmpty)).toBeVisible();
  await scan(page, DRYWALL);
  await scan(page, DRYWALL);
  await expect(page.getByTestId("cart-total")).toHaveText("136 000 so'm");

  // Ikkinchi mijoz to'ladi — uning yorlig'i yopiladi, birinchisi qoladi
  await page.keyboard.press("F2");
  await page.getByRole("button", { name: uz.pos.confirmSale }).click();
  await expect(page.getByTestId("sale-done")).toBeVisible();
  await expect(page.getByTestId("cart-tab")).toHaveCount(1);
  await expect(page.getByTestId("cart-total")).toHaveText("62 000 so'm");

  // Qizil tugma bilan tozalash
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: uz.pos.clear }).click();
  await expect(page.getByText(uz.pos.cartEmpty)).toBeVisible();
});

test("smena va qaytarish: naqd sotuv → qisman qaytarish → smena yopiladi", async ({ page }) => {
  await login(page, "903333333");

  // Ochiq smena qolgan bo'lsa — avval yopamiz (testlar qayta ishga tushganda)
  await page.goto("/pos/shifts");
  if (await page.getByRole("button", { name: uz.shifts.close }).isVisible()) {
    await page.getByLabel(uz.shifts.countedCash).fill("0");
    await page.getByRole("button", { name: uz.shifts.close }).click();
    await expect(page.getByRole("button", { name: uz.shifts.open })).toBeVisible();
  }
  await page.getByLabel(uz.shifts.openingCash).fill("100 000");
  await page.getByRole("button", { name: uz.shifts.open }).click();
  await expect(page.getByTestId("shift-expected")).toHaveText("100 000 so'm");

  await page.goto("/pos");
  await expect(page.getByTestId("shift-chip")).toContainText(uz.shifts.openShort);
  await scan(page, CEMENT);
  await page.getByLabel(`${uz.pos.quantity}: Sement M400, 50 kg`).fill("3");
  await page.keyboard.press("F2");
  await page.getByRole("button", { name: uz.pos.confirmSale }).click();
  await expect(page.getByTestId("sale-done")).toBeVisible();
  await page.getByRole("link", { name: uz.pos.openReceipt }).click();
  await page.waitForURL(/\/pos\/sales\/[^/]+$/);

  // 1 qop qaytariladi (naqd)
  await page.getByRole("link", { name: uz.returns.action }).click();
  await page.getByLabel(`${uz.returns.toReturn}: Sement M400, 50 kg`).fill("1");
  await expect(page.getByTestId("return-total")).toHaveText("62 000 so'm");
  await page.getByRole("radio", { name: uz.paymentMethods.CASH }).click();
  await page.getByLabel(uz.returns.reason).fill("E2E test");
  await page.getByRole("button", { name: uz.returns.confirm }).click();
  await page.waitForURL(/\/pos\/sales\/[^/]+$/);
  await expect(page.getByTestId("sale-returns")).toContainText("62 000 so'm");

  // Bugungi sotuvlar: qaytarish ro'yxatda va tushumdan ayirilgan
  await page.goto("/pos/sales");
  await expect(page.getByTestId("sales-summary")).toContainText(uz.receipt.returnsSum);

  // Smena: 100 000 + 186 000 − 62 000 = 224 000; 220 000 sanaldi → 4 000 kamomad
  await page.goto("/pos/shifts");
  await expect(page.getByTestId("shift-expected")).toHaveText("224 000 so'm");
  await page.getByLabel(uz.shifts.countedCash).fill("220 000");
  await page.getByRole("button", { name: uz.shifts.close }).click();
  await expect(page.getByText(/Smena № \d+ yopildi/)).toBeVisible();
  await expect(page.getByTestId("shift-row").first()).toContainText(
    `${uz.shifts.shortage}: 4 000 so'm`,
  );
});

test("panel: raqamlar bosiladi va qayerdan kelganini ko'rsatadi", async ({ page }) => {
  await login(page, "901111111");
  await page.getByTestId("stat-revenue").click();
  await expect(page).toHaveURL(/\/pos\/sales$/);
  await expect(page.getByTestId("net-revenue")).toBeVisible();

  await page.goto("/dashboard");
  await page.getByTestId("stat-overdue").click();
  await expect(page).toHaveURL(/overdue=1/);
  await expect(page.getByLabel(uz.customers.overdueOnly)).toBeChecked();

  await page.goto("/dashboard");
  await page.getByTestId("stat-low").click();
  await expect(page).toHaveURL(/\/dashboard\/warehouse\?low=1/);
});

test("chek printer sahifasi: menyusiz, faqat chek", async ({ page }) => {
  await login(page, "903333333");
  await page.goto("/pos/sales");
  const first = page.locator("table a").first();
  const href = await first.getAttribute("href");
  const id = href!.split("/").pop();
  await page.goto(`/chek/${id}`);
  await expect(page.getByTestId("receipt")).toBeVisible();
  await expect(page.getByRole("button", { name: uz.auth.logout })).toHaveCount(0);
  expect(t(uz.pos.saleDone, { number: 1 })).toContain("1");
});
