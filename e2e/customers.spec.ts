import { expect, test, type Page } from "@playwright/test";
import { uz } from "../lib/i18n/uz";
import { login } from "./helpers";

// Seed: Qora shokolad 70% — 4780000000011, 14 000 so'm / dona.
const CEMENT_BARCODE = "4780000000011";

async function scan(page: Page, code: string) {
  const search = page.getByLabel(uz.pos.searchPlaceholder);
  await search.fill(code);
  await search.press("Enter");
  await expect(search).toHaveValue("");
}

const randomPhone = () => `93${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

test("kassir: yangi mijoz, qisman nasiya, chek, keyin qarz to'lovi", async ({ page }) => {
  const name = `E2E Mijoz ${Date.now()}`;
  await login(page, "903333333");

  await scan(page, CEMENT_BARCODE);
  await page.getByLabel(`${uz.pos.quantity}: Qora shokolad 70%, 100 g`).fill("2");

  // Mijoz yo'q — nasiya maydoni yopiq
  // To'lov oynasi: mijoz yo'q — nasiya maydoni yopiq
  await page.keyboard.press("F2");
  await expect(page.getByLabel(uz.pos.debt, { exact: true })).toBeDisabled();

  // To'lov oynasining o'zida tezkor mijoz qo'shish
  await page.getByLabel(uz.customers.customer, { exact: true }).fill(name);
  await page.getByRole("button", { name: new RegExp(uz.customers.quickAdd) }).click();
  await page.getByLabel(uz.customers.phone).fill(randomPhone());
  await page.getByRole("button", { name: uz.common.save, exact: true }).click();
  await expect(page.getByTestId("picked-customer")).toHaveText(name);

  // Usta: seed'dagi Hamkor Rustam
  await page.getByLabel(uz.customers.master, { exact: true }).fill("Rustam");
  await page.getByRole("button", { name: /Hamkor Rustam/ }).click();
  await expect(page.getByTestId("picked-master")).toContainText("Hamkor Rustam");

  // 28 000: 8 000 naqd + 20 000 nasiya
  await page.getByLabel(uz.pos.cash, { exact: true }).fill("8 000");
  await page.getByLabel(uz.pos.debt, { exact: true }).fill("20 000");
  await page.getByLabel(uz.customers.dueDate).fill("2026-12-01");
  await page.getByRole("button", { name: uz.pos.confirmSale }).click();
  await expect(page.getByTestId("sale-done")).toBeVisible();
  await page.getByRole("link", { name: uz.pos.openReceipt }).click();
  await page.waitForURL(/\/pos\/sales\/.+/);

  const receipt = page.getByTestId("receipt");
  await expect(receipt).toContainText(name);
  await expect(receipt).toContainText(uz.paymentMethods.DEBT);
  await expect(receipt).toContainText("20 000 so'm");
  await expect(receipt).toContainText("01.12.2026");
  await expect(receipt).not.toContainText("Rustam"); // usta chekda ko'rinmaydi

  // Mijoz sahifasi: qarz 20 000 → 8 000 to'lov → 12 000
  await page.goto(`/pos/customers?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await expect(page.getByTestId("customer-debt")).toHaveText("20 000 so'm");
  const form = page.getByTestId("debt-payment");
  await form.getByLabel(uz.customers.amount).fill("8 000");
  await form.getByRole("button", { name: uz.customers.receivePayment }).click();
  await expect(page.getByTestId("customer-debt")).toHaveText("12 000 so'm");
  await expect(page.getByTestId("ledger-row")).toHaveCount(2);

  // Qarzdan ortiq to'lov rad etiladi
  await form.getByLabel(uz.customers.amount).fill("70 000");
  await form.getByRole("button", { name: uz.customers.receivePayment }).click();
  await expect(page.getByText(uz.customers.paymentTooLarge)).toBeVisible();
});

test("egasi: usta qo'shadi, bonus hisoblanadi va beriladi", async ({ page }) => {
  const name = `E2E Usta ${Date.now()}`;
  await login(page, "901111111");

  await page.goto("/pos/customers/new");
  await page.getByLabel(uz.customers.name).fill(name);
  await page.getByLabel(uz.customers.phone).fill(randomPhone());
  await page.getByLabel(uz.customers.isMaster).check();
  await page.getByLabel(uz.customers.bonusPercent).fill("5");
  await page.getByRole("button", { name: uz.common.save }).click();
  // "/pos/customers/new" emas — yaratilgan mijoz sahifasi
  await page.waitForURL(/\/pos\/customers\/(?!new$)[^/?]+$/);
  const masterUrl = page.url();
  await expect(page.getByTestId("customer-bonus")).toHaveText("0 so'm");

  // 2 dona shokolad = 28 000 → 5% = 1 400
  await page.goto("/pos");
  await scan(page, CEMENT_BARCODE);
  await page.getByLabel(`${uz.pos.quantity}: Qora shokolad 70%, 100 g`).fill("2");
  await page.keyboard.press("F2");
  await page.getByLabel(uz.customers.master, { exact: true }).fill(name);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: uz.pos.confirmSale }).click();
  await expect(page.getByTestId("sale-done")).toBeVisible();

  await page.goto(masterUrl);
  await expect(page.getByTestId("customer-bonus")).toHaveText("1 400 so'm");
  const payout = page.getByTestId("bonus-payout");
  await payout.getByRole("button", { name: uz.customers.payBonus }).click();
  await expect(page.getByTestId("customer-bonus")).toHaveText("0 so'm");
  await expect(page.getByText(uz.customers.entryTypes.PAYOUT)).toBeVisible();
});

test("kassir ustaning bonusini bera olmaydi va usta belgisini o'zgartira olmaydi", async ({
  page,
}) => {
  await login(page, "903333333");
  await page.goto("/pos/customers?masters=1");
  await page.getByRole("link", { name: /Hamkor Rustam/ }).click();
  await expect(page.getByTestId("bonus-payout")).toHaveCount(0);
  await expect(page.getByText(uz.customers.readOnlyFields)).toBeVisible();
  await expect(page.getByLabel(uz.customers.isMaster)).toHaveCount(0);
});
