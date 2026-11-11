import { expect, test } from "@playwright/test";
import { uz } from "../lib/i18n/uz";
import { login } from "./helpers";

test("yangilik: admin yozadi va chop etadi → sayt, poster, kassir dasturida", async ({
  browser,
}) => {
  const title = `E2E yangilik ${Date.now()}`;

  const admin = await browser.newPage();
  await login(admin, "900000000");
  await admin.getByRole("link", { name: uz.news.adminTitle }).click();
  await admin.getByRole("link", { name: uz.news.create }).click();
  await admin.getByLabel(uz.news.fieldTitle).fill(title);
  await admin
    .getByLabel(uz.news.fieldBody)
    .fill("Kassada endi navbatdagi mijoz uchun alohida savatcha bor.\n\nSinab ko'ring!");
  await admin.getByRole("button", { name: uz.news.save }).click();
  await admin.waitForURL(/\/admin\/news\/(?!new$)[^/]+$/);
  await expect(admin.getByText(uz.news.draft)).toBeVisible();

  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: uz.news.publish }).click();
  await expect(admin.getByRole("status")).toContainText("Chop etildi");
  await admin.close();

  // Kassir: qo'ng'iroqchada o'qilmagan → ochadi → belgi yo'qoladi
  const cashier = await browser.newPage();
  await login(cashier, "903333333");
  await expect(cashier.getByTestId("badge-news")).toBeVisible();
  await cashier.getByRole("link", { name: uz.news.nav }).click();
  await expect(cashier.getByTestId("app-news").filter({ hasText: title })).toBeVisible();
  await cashier.goto("/pos");
  await expect(cashier.getByTestId("badge-news")).toHaveCount(0);
  await cashier.close();
});

test("AI yordamchi: kalit bo'lmasa — Yordam oynasida faqat aloqa va xabar", async ({ page }) => {
  await login(page, "903333333");
  await page.getByTestId("help-button").click();
  // Lokal .env'da GEMINI_API_KEY bo'lmasa AI yorlig'i chiqmaydi
  const hasAi = await page.getByRole("tab", { name: uz.assistant.tab }).count();
  if (hasAi) await expect(page.getByTestId("assistant-chat")).toBeVisible();
  else await expect(page.getByLabel(uz.support.reportTitle)).toBeVisible();
});
