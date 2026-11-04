import { expect, test } from "@playwright/test";
import { offer, privacy } from "../lib/i18n/legal.uz";
import { marketing as m } from "../lib/i18n/marketing.uz";
import { uz } from "../lib/i18n/uz";

test("mehmon: bosh sahifa bo'limlari, tugmalar va narxlar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: m.hero.title })).toBeVisible();
  await expect(page.getByRole("link", { name: m.nav.login }).first()).toHaveAttribute(
    "href",
    "/login",
  );
  await expect(page.getByRole("link", { name: m.hero.primary })).toHaveAttribute(
    "href",
    "/register",
  );
  await expect(page.getByRole("link", { name: m.hero.secondary })).toHaveAttribute(
    "href",
    "#aloqa",
  );
  await expect(page.getByTestId("feature")).toHaveCount(m.features.items.length);
  await expect(page.getByTestId("pricing-plan")).toHaveCount(3);
  await expect(page.getByText(m.guarantee.title)).toBeVisible();
  // Haqiqiy fikrlar yo'q — bo'lim umuman chiqmaydi
  await expect(page.getByTestId("testimonials")).toHaveCount(0);
  await expect(page.getByTestId("cabinet-link")).toHaveCount(0);
});

test("ariza: reklama havolasi → forma → /rahmat → admin ko'radi, tahrirlaydi, CSV", async ({
  browser,
}) => {
  const name = `E2E Ariza ${Date.now()}`;
  const digits = `33${String(Date.now()).slice(-7)}`;

  // Har test o'z IP'si bilan — spam cheklovi (10 daqiqada 5 ta) boshqa testlarga ta'sir qilmasin
  const visitor = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": `e2e-${Date.now()}` },
  });
  const page = await visitor.newPage();
  await page.goto("/?utm_source=instagram&utm_campaign=smeta&ref=PILOT");
  await page.goto("/#aloqa"); // belgisiz sahifaga o'tsa ham cookie'da qoladi
  const form = page.locator("#aloqa");

  // Bo'sh forma — maydonlar ostida xatolar
  await form.getByRole("button", { name: m.lead.submit }).click();
  await expect(form.getByText(m.lead.errors.name)).toBeVisible();
  await expect(form.getByText(m.lead.errors.city)).toBeVisible();

  await form.getByLabel(m.lead.name).fill(name);
  await form.getByLabel(m.lead.phone).pressSequentially(digits);
  await expect(form.getByLabel(m.lead.phone)).toHaveValue(
    `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`,
  );
  await form.getByLabel(m.lead.city).selectOption("ANDIJAN");
  await form.getByLabel(m.lead.shop).fill("E2E Market");
  await form.getByRole("button", { name: m.lead.submit }).click();
  await page.waitForURL(/\/rahmat$/);
  await expect(page.getByRole("heading", { name: m.thanks.title })).toBeVisible();
  await visitor.close();

  // Platforma admini
  const admin = await browser.newPage();
  await admin.goto("/login");
  await admin.locator("#phone").fill("900000000");
  await admin.locator("#password").fill("demo1234");
  await admin.getByRole("button", { name: uz.auth.login }).click();
  await admin.waitForURL(/\/admin/);
  await expect(admin.getByTestId("lead-funnel")).toBeVisible();

  await admin.goto("/admin/leads?city=ANDIJAN");
  const row = admin.getByTestId("lead-row").filter({ hasText: name });
  await expect(row).toContainText("instagram / smeta");
  await expect(row).toContainText(uz.leads.statuses.NEW);

  await row.getByRole("link", { name }).click();
  // React to'liq ishga tushguncha kutamiz — aks holda tanlangan holat qayta "Yangi"ga qaytadi
  await admin.waitForLoadState("networkidle");
  await admin.getByLabel(uz.leads.status).selectOption("VISIT_SET");
  await admin.getByLabel(uz.leads.assignee).fill("Jasur");
  await admin.getByLabel(uz.leads.note).fill("Payshanba 10:00");
  await admin.getByRole("button", { name: uz.leads.save }).click();
  await expect(admin.getByText(uz.leads.saved)).toBeVisible();
  await admin.reload();
  await expect(admin.getByLabel(uz.leads.status)).toHaveValue("VISIT_SET");
  await expect(admin.getByLabel(uz.leads.assignee)).toHaveValue("Jasur");

  await admin.goto("/admin/leads?status=VISIT_SET");
  await expect(admin.getByTestId("lead-row").filter({ hasText: name })).toContainText("Jasur");

  const [download] = await Promise.all([
    admin.waitForEvent("download"),
    admin.getByTestId("leads-export").click(),
  ]);
  const csv = await (await download.createReadStream()).toArray();
  const text = Buffer.concat(csv).toString("utf8");
  expect(text).toContain(name);
  expect(text).toContain("Payshanba 10:00");
});

test("telefon (390 px): gorizontal siljish yo'q, menyu ochiladi", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator(`summary[aria-label="${m.nav.menu}"]`).click();
  await expect(page.getByRole("link", { name: m.nav.pricing }).last()).toBeVisible();
});

test("kirgan foydalanuvchi: tepada 'Kabinetga o'tish'", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#phone").fill("901111111");
  await page.locator("#password").fill("demo1234");
  await page.getByRole("button", { name: uz.auth.login }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto("/");
  const cabinet = page.getByTestId("cabinet-link").first();
  await expect(cabinet).toHaveText(m.nav.cabinet);
  await expect(cabinet).toHaveAttribute("href", "/dashboard");
  await expect(page.getByRole("link", { name: m.nav.trial, exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: m.nav.login, exact: true })).toHaveCount(0);
});

test("sotuv saytining barcha sahifalari ochiladi", async ({ page }) => {
  for (const [path, heading] of [
    ["/narxlar", m.pricing.pageTitle],
    ["/jihozlar", m.equipment.title],
    ["/savollar", m.faqPage.title],
    ["/pilot", m.pilot.title],
    ["/aloqa", m.contact.title],
    ["/register", m.lead.trialTitle],
    ["/rahmat", m.thanks.title],
    ["/oferta", offer.title],
    ["/maxfiylik", privacy.title],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});
