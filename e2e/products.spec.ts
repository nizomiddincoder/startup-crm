import { expect, test, type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";

// Eng kichik haqiqiy PNG (1×1, qizil) — rasm yuklashni sinash uchun
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

// Seed'dagi demo do'kon (prisma/seed.ts). Avval: npm run db:local
async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill("demo1234");
  await page.getByRole("button", { name: uz.auth.login }).click();
  await page.waitForURL(/\/(dashboard|pos|admin)/);
}

test("egasi mahsulot qo'shadi, tahrirlaydi va arxivlaydi", async ({ page }) => {
  const name = `E2E mahsulot ${Date.now()}`;
  const barcode = String(Date.now()).slice(-12);

  await login(page, "901111111");
  await page.goto("/dashboard/products/new");

  // Xato: narx yozilmagan — forma yozilgan qiymatlarni saqlab qolishi kerak
  await page.locator("#name").fill(name);
  await page.locator("#barcode").fill(barcode);
  await page.getByRole("button", { name: uz.common.save }).click();
  await expect(page.getByText(uz.validation.required)).toBeVisible();
  await expect(page.locator("#name")).toHaveValue(name);
  await expect(page.locator("#barcode")).toHaveValue(barcode);

  await page.locator("#salePrice").fill("125 000");
  await page.locator("#unit").selectOption("BAG");
  await page.getByRole("button", { name: uz.common.save }).click();
  // Saqlangach — tahrirlash sahifasi: darhol rasm qo'shish mumkin
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await expect(page.getByTestId("product-image")).toBeVisible();

  // Rasm yuklanadi → kassa uchun oq fonli kvadrat tayyor
  await page.getByTestId("image-input").setInputFiles({
    name: "sement.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await expect(page.getByTestId("image-standard")).toBeVisible();
  await page.goto("/dashboard/products");

  // Shtrix-kod bo'yicha qidiruv (skaner shunday ishlaydi)
  await page.getByLabel(uz.common.search).fill(barcode);
  await page.getByLabel(uz.common.search).press("Enter");
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("125 000 so'm");
  await expect(row).toContainText(uz.units.BAG);

  // Tahrirlash
  await row.getByRole("link", { name }).click();
  await page.locator("#salePrice").fill("130000");
  await page.getByRole("button", { name: uz.common.save }).click();
  await page.waitForURL(/\/dashboard\/products$/);
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("130 000 so'm");

  // Arxivlash — ro'yxatdan yo'qoladi
  await page.getByRole("link", { name }).click();
  await page.getByRole("button", { name: uz.products.archive }).click();
  await expect(page.getByRole("button", { name: uz.products.restore })).toBeVisible();
  await page.goto(`/dashboard/products?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(uz.products.empty)).toBeVisible();
});

test("takroriy shtrix-kod xato beradi", async ({ page }) => {
  await login(page, "901111111");
  await page.goto("/dashboard/products/new");
  await page.locator("#name").fill("E2E takror");
  await page.locator("#salePrice").fill("1000");
  await page.locator("#barcode").fill("4780000000011"); // seed'dagi Qora shokolad 70%
  await page.getByRole("button", { name: uz.common.save }).click();
  await expect(page.getByText(uz.products.barcodeTaken)).toBeVisible();
});

test("omborchi mahsulotlarni ko'radi, lekin o'zgartira olmaydi", async ({ page }) => {
  await login(page, "904444444");
  await page.goto("/dashboard/products");
  await expect(page.getByRole("row", { name: /Qora shokolad 70%, 100 g/ })).toBeVisible();
  await expect(page.getByRole("link", { name: uz.products.add })).toHaveCount(0);
  await page.goto("/dashboard/products/new");
  await expect(page).toHaveURL(/\/dashboard\/products$/);
});

test("kategoriya qo'shiladi, takrori rad etiladi", async ({ page }) => {
  const name = `E2E kategoriya ${Date.now()}`;
  await login(page, "902222222");
  await page.goto("/dashboard/categories");
  const input = page.getByLabel(uz.categories.name);
  await input.fill(name);
  await page.getByRole("button", { name: uz.categories.add }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();

  await input.fill(name);
  await page.getByRole("button", { name: uz.categories.add }).click();
  await expect(page.getByText(uz.categories.duplicate)).toBeVisible();

  // Bo'sh kategoriyani o'chirish
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("row", { name: new RegExp(name) })
    .getByRole("button", { name: uz.common.delete })
    .click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
});
