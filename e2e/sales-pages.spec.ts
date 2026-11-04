import { expect, test, type Browser } from "@playwright/test";
import { marketing as m } from "../lib/i18n/marketing.uz";
import { pricing } from "../lib/pricing";

/** Har test o'z "IP"si bilan — ariza cheklovi (10 daqiqada 5 ta) testlarni to'xtatmasin. */
async function visitor(browser: Browser) {
  const ctx = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": `e2e-${Date.now()}-${Math.random()}` },
  });
  return ctx.newPage();
}

const digits = () => `33${String(Date.now()).slice(-7)}`;

test("/narxlar: 3 paket, ulanish narxi, yillik almashtirgich", async ({ page }) => {
  await page.goto("/narxlar");
  const plans = page.getByTestId("pricing-plan");
  await expect(plans).toHaveCount(3);
  await expect(plans.nth(0)).toContainText(m.pricing.plans.standard.name);
  await expect(plans.nth(0).getByTestId("plan-monthly")).toHaveText("390 000 so'm");
  await expect(plans.nth(0).getByTestId("plan-setup")).toHaveText("1 000 000 so'm");
  await expect(plans.nth(1)).toContainText(m.pricing.popular);
  await expect(plans.nth(2).getByTestId("plan-setup")).toContainText(m.pricing.plusEquipment);

  await page.getByRole("radio", { name: new RegExp(m.pricing.billingAnnual) }).click();
  await expect(plans.nth(0).getByTestId("plan-monthly")).toHaveText("325 000 so'm");
  await expect(plans.nth(0)).toContainText("3 900 000 so'm");
});

test("/jihozlar: narxni so'rang, buyurtma formaga to'plam nomini qo'shadi", async ({ browser }) => {
  const page = await visitor(browser);
  await page.goto("/jihozlar");
  await expect(page.getByTestId("equipment-kit")).toHaveCount(2);
  if (pricing.equipment.kits[0].price === null) {
    await expect(page.getByTestId("kit-price").first()).toHaveText(m.equipment.askPrice);
  }
  await page.getByRole("link", { name: m.equipment.order }).first().click();
  await page.waitForURL(/kit=econom/);
  const form = page.locator("#buyurtma");
  await expect(form.getByRole("heading")).toContainText(m.equipment.kits.econom.name);
  await expect(form.locator('input[name="message"]')).toHaveValue(m.equipment.kits.econom.message);

  await form.getByLabel(m.lead.name).fill("E2E Jihoz");
  await form.getByLabel(m.lead.phone).fill(digits());
  await form.getByLabel(m.lead.city).selectOption("FERGANA");
  await form.getByRole("button", { name: m.lead.submit }).click();
  await expect(page).toHaveURL(/\/rahmat$/);
});

test("/register: oferta va maxfiylikka roziliksiz yuborilmaydi", async ({ browser }) => {
  const page = await visitor(browser);
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  // Do'kon nomi yozilmasa — "E2E Rozilik do'koni" (teardown o'chiradi)
  await page.getByLabel(m.lead.name).fill("E2E Rozilik");
  await page.getByLabel(m.lead.phone).fill(digits());
  await page.getByLabel(m.lead.city).selectOption("NAMANGAN");
  await page.getByLabel(m.signup.password).fill("rozilik-123");
  await page.getByRole("button", { name: m.signup.submit }).click();
  await expect(page.getByText(m.consent.required)).toBeVisible();
  await expect(page.getByRole("link", { name: m.consent.offer, exact: true })).toHaveAttribute(
    "href",
    "/oferta",
  );

  // Xatodan keyin oldin yozilgan telefon va shahar o'chib ketmasligi kerak
  await expect(page.getByLabel(m.lead.phone)).not.toHaveValue("");
  await expect(page.getByLabel(m.lead.city)).toHaveValue("NAMANGAN");

  await page.getByTestId("consent").check();
  await page.getByRole("button", { name: m.signup.submit }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("/pilot: menyusiz, qolgan o'rinlar config'dan, forma bor", async ({ page }) => {
  await page.goto("/pilot");
  const { seatsLeft, totalSeats } = pricing.pilot;
  await expect(page.getByTestId("pilot-seats")).toContainText(
    seatsLeft > 0 ? `${seatsLeft} / ${totalSeats}` : m.pilot.soldOut,
  );
  // Reklama sahifasi — tepada asosiy menyu yo'q (footer'dagi havolalar qoladi)
  const header = page.locator("header");
  await expect(header.getByRole("link", { name: m.nav.pricing, exact: true })).toHaveCount(0);
  await expect(header.getByRole("link", { name: m.nav.login, exact: true })).toHaveCount(0);
  await expect(
    page.locator("#pilot-forma").getByRole("button", { name: m.lead.submit }),
  ).toBeVisible();
});

test("/savollar: 10 ta savol, javob ochiladi", async ({ page }) => {
  await page.goto("/savollar");
  const items = page.getByTestId("faq-list").locator("details");
  await expect(items).toHaveCount(10);
  await items.nth(1).locator("summary").click();
  await expect(page.getByText(m.faqPage.items[1].a)).toBeVisible();
});

test("/aloqa: kontaktlar, xarita joyi va forma", async ({ page }) => {
  await page.goto("/aloqa");
  await expect(page.getByText(m.contact.workHours)).toBeVisible();
  await expect(page.getByTestId("map-slot")).toBeVisible();
  await expect(page.getByRole("button", { name: m.lead.submit })).toBeVisible();
});
