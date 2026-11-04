import { expect, test, type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill("demo1234");
  await page.getByRole("button", { name: uz.auth.login }).click();
  await page.waitForURL(/\/(dashboard|pos|admin)/);
}

async function addToDocument(page: Page, name: string) {
  const search = page.getByLabel(uz.warehouse.addProducts);
  await search.fill(name);
  await search.press("Enter");
  await expect(page.getByTestId("doc-line").filter({ hasText: name })).toBeVisible();
}

test("egasi: kirim → hisobdan chiqarish → inventarizatsiya, qoldiq va tarix to'g'ri", async ({
  page,
}) => {
  const name = `E2E ombor ${Date.now()}`;
  await login(page, "901111111");

  // Yangi mahsulot (qoldig'i 0)
  await page.goto("/dashboard/products/new");
  await page.locator("#name").fill(name);
  await page.locator("#unit").selectOption("BAG");
  await page.locator("#salePrice").fill("60 000");
  await page.locator("#minStock").fill("5");
  await page.getByRole("button", { name: uz.common.save }).click();
  // Saqlangach — tahrirlash sahifasi (rasm qo'shish uchun)
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  // Kirim: 10 qop, kelish narxi 50 000
  await page.goto("/dashboard/warehouse/new/receipt");
  await page.getByLabel(uz.warehouse.supplier).fill("E2E zavod");
  await addToDocument(page, name);
  await page.getByLabel(`${uz.pos.quantity}: ${name}`).fill("10");
  await page.getByLabel(`${uz.warehouse.costPerUnit}: ${name}`).fill("50 000");
  await page.getByRole("button", { name: uz.warehouse.save }).click();
  await page.waitForURL(/\/warehouse\/documents\/.+/);
  await expect(page.getByText(uz.warehouse.types.RECEIPT).first()).toBeVisible();
  await expect(page.getByTestId("doc-line")).toContainText("500 000 so'm");

  // Hisobdan chiqarish: sababsiz saqlab bo'lmaydi
  await page.goto("/dashboard/warehouse/new/write-off");
  await addToDocument(page, name);
  await page.getByLabel(`${uz.pos.quantity}: ${name}`).fill("2");
  await expect(page.getByRole("button", { name: uz.warehouse.save })).toBeDisabled();
  await page.getByLabel(uz.warehouse.reason).fill("Yorilib ketdi");
  await page.getByRole("button", { name: uz.warehouse.save }).click();
  await page.waitForURL(/\/warehouse\/documents\/.+/);

  // Inventarizatsiya: tizimda 8, sanaldi 6 → farq -2
  await page.goto("/dashboard/warehouse/new/inventory");
  await addToDocument(page, name);
  const line = page.getByTestId("doc-line").filter({ hasText: name });
  await expect(line).toContainText("8 qop");
  await page.getByLabel(`${uz.warehouse.counted}: ${name}`).fill("6");
  await expect(line).toContainText("-2");
  await page.getByRole("button", { name: uz.warehouse.save }).click();
  await page.waitForURL(/\/warehouse\/documents\/.+/);

  // Qoldiqlar: 6 qop, minimal 5 dan yuqori — "kam qoldi" emas
  await page.goto(`/dashboard/warehouse?q=${encodeURIComponent(name)}`);
  const row = page.getByTestId("stock-row").filter({ hasText: name });
  await expect(row).toContainText("6 qop");
  await expect(row).toContainText("300 000 so'm"); // 6 × 50 000
  await expect(row.getByText(uz.warehouse.low)).toHaveCount(0);

  // Tarix: 3 ta harakat, oxirgi qoldiq 6
  await row.getByRole("link", { name }).click();
  await expect(page.getByTestId("product-balance")).toHaveText("6 qop");
  await expect(page.getByRole("row")).toHaveCount(4); // sarlavha + 3 harakat
  await expect(page.getByText(uz.warehouse.movementTypes.ADJUSTMENT)).toBeVisible();
});

test("omborchi qoldiqlarni ko'radi va hujjat yarata oladi", async ({ page }) => {
  await login(page, "904444444");
  await page.getByRole("link", { name: uz.nav.warehouse }).click();
  await expect(page.getByRole("heading", { name: uz.warehouse.stockTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: uz.warehouse.receipt })).toBeVisible();

  // "Faqat kam qolganlar" — seed'da Sement M500: 15 qop, minimal 20
  await page.getByLabel(uz.warehouse.lowOnly).check();
  await page.getByRole("button", { name: uz.common.search }).click();
  await expect(page.getByTestId("stock-row").filter({ hasText: "Sement M500" })).toBeVisible();
});

test("kassa qidiruvida ombor qoldig'i ko'rinadi", async ({ page }) => {
  await login(page, "903333333");
  await page.getByLabel(uz.pos.searchPlaceholder).fill("Sement M500");
  await expect(page.getByRole("option", { name: /Sement M500/ })).toContainText(
    uz.warehouse.inStock,
  );
});
