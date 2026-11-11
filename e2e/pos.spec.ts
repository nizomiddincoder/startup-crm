import { expect, test, type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";
import { login } from "./helpers";

// Seed'dagi demo do'kon (prisma/seed.ts): Qora shokolad 70% — 4780000000011, 14 000 so'm / dona;
// Shokoladli konfet assorti — 95 000 so'm / kg. Testlar demo do'konda haqiqiy sotuvlar yaratadi.
const CEMENT_BARCODE = "4780000000011";

async function scan(page: Page, code: string) {
  const search = page.getByLabel(uz.pos.searchPlaceholder);
  await search.fill(code);
  await search.press("Enter");
  await expect(search).toHaveValue("");
}

test("kassir: skaner, nom bo'yicha qidiruv, kasr miqdor, naqd to'lov va qaytim", async ({
  page,
}) => {
  await login(page, "903333333");
  await expect(page).toHaveURL(/\/pos$/);

  await scan(page, CEMENT_BARCODE);
  await scan(page, CEMENT_BARCODE); // ikkinchi skaner — miqdor 2 bo'ladi
  await expect(page.getByLabel(`${uz.pos.quantity}: Qora shokolad 70%, 100 g`)).toHaveValue("2");

  // 2 × 14 000 + 1,5 kg × 95 000 = 170 500
  await page.getByLabel(uz.pos.searchPlaceholder).fill("Shokoladli konfet");
  await page
    .getByRole("option", { name: /Shokoladli konfet assorti\s/ })
    .first()
    .click();
  await page.getByLabel(`${uz.pos.quantity}: Shokoladli konfet assorti`).fill("1,5");
  await expect(page.getByTestId("cart-total")).toHaveText("170 500 so'm");

  await page.keyboard.press("F2");
  await expect(page.getByTestId("payment-total")).toHaveText("170 500 so'm");
  await page.getByLabel(uz.pos.cash, { exact: true }).fill("180 000");
  await expect(page.getByTestId("payment-change")).toHaveText("9 500 so'm");
  await page.getByRole("button", { name: uz.pos.confirmSale }).click();

  // Chek printerga ketadi, kassa keyingi mijozga tayyor
  await expect(page.getByTestId("sale-done")).toBeVisible();
  await page.getByRole("link", { name: uz.pos.openReceipt }).click();
  await page.waitForURL(/\/pos\/sales\/.+/);
  const receipt = page.getByTestId("receipt");
  await expect(receipt).toContainText("170 500 so'm");
  await expect(receipt).toContainText("1,5 kg × 95 000 so'm");
  await expect(receipt).toContainText(uz.pos.change);
  await expect(receipt).toContainText("9 500 so'm");

  // Savatcha tozalangan
  await page.getByRole("main").getByRole("link", { name: uz.receipt.newSale }).click();
  await expect(page.getByText(uz.pos.cartEmpty)).toBeVisible();
});

test("kassir: qopni kasr sonda sotib bo'lmaydi, kartadan ortiqcha to'lov rad etiladi", async ({
  page,
}) => {
  await login(page, "903333333");
  await scan(page, CEMENT_BARCODE);

  const qty = page.getByLabel(`${uz.pos.quantity}: Qora shokolad 70%, 100 g`);
  await qty.fill("1,5");
  await expect(page.getByText(uz.pos.wholeNumberOnly)).toBeVisible();
  await expect(page.getByRole("button", { name: /To'lov/ })).toBeDisabled();

  await qty.fill("1");
  await page.getByRole("button", { name: /To'lov/ }).click();
  await page.getByLabel(uz.pos.cash, { exact: true }).fill("");
  await page.getByLabel(uz.pos.card, { exact: true }).fill("70 000");
  await expect(page.getByText(uz.pos.nonCashOverpaid)).toBeVisible();
  await expect(page.getByRole("button", { name: uz.pos.confirmSale })).toBeDisabled();

  await page.keyboard.press("Escape");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: uz.pos.clear }).click();
  await expect(page.getByText(uz.pos.cartEmpty)).toBeVisible();
});

test("smeta: tuziladi, kassaga yuklanadi va kartaga sotiladi", async ({ page }) => {
  const customer = `E2E Usta ${Date.now()}`;
  await login(page, "902222222"); // menejer
  await page.goto("/pos");

  await scan(page, CEMENT_BARCODE);
  await page.getByLabel(`${uz.pos.quantity}: Qora shokolad 70%, 100 g`).fill("10");
  await page.getByRole("button", { name: uz.estimates.estimate, exact: true }).click();
  await page.getByLabel(uz.pos.discount).fill("20 000");
  await page.getByLabel(uz.estimates.customerName).fill(customer);
  await page.getByLabel(uz.estimates.customerPhone).fill("90 555 44 33");
  await page.getByRole("button", { name: uz.estimates.create }).click();

  await page.waitForURL(/\/pos\/estimates\/.+/);
  await expect(page.getByTestId("estimate-total")).toHaveText("120 000 so'm");
  await expect(page.getByText(customer)).toBeVisible();
  const estimateUrl = page.url();

  await page.getByRole("link", { name: uz.estimates.loadToPos }).click();
  await page.waitForURL(/\/pos$/);
  await expect(page.getByText(uz.pos.pricesFromEstimate)).toBeVisible();
  await expect(page.getByTestId("cart-total")).toHaveText("120 000 so'm");

  await page.keyboard.press("F2");
  await page.getByRole("button", { name: uz.pos.allByCard }).click();
  await page.getByRole("button", { name: uz.pos.confirmSale }).click();
  await expect(page.getByTestId("sale-done")).toBeVisible();
  await page.getByRole("link", { name: uz.pos.openReceipt }).click();
  await page.waitForURL(/\/pos\/sales\/.+/);
  await expect(page.getByTestId("receipt")).toContainText(uz.estimates.number);
  await expect(page.getByTestId("receipt")).toContainText(uz.pos.card);

  await page.goto(estimateUrl);
  await expect(page.getByText(uz.estimates.statuses.CONVERTED).first()).toBeVisible();
  await expect(page.getByRole("link", { name: uz.estimates.loadToPos })).toHaveCount(0);
});

test("omborchi kassaga kira olmaydi", async ({ page }) => {
  await login(page, "904444444");
  await page.goto("/pos/sales");
  await expect(page).toHaveURL(/\/dashboard$/);
});
