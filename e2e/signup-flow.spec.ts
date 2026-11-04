import { expect, test } from "@playwright/test";
import { marketing as m } from "../lib/i18n/marketing.uz";
import { uz } from "../lib/i18n/uz";
import { STARTER_CATALOG } from "../lib/services/leads/starter-catalog";

// Yakuniy yo'l: sayt → "Bepul sinash" → ro'yxatdan o'tish → kabinet → chiqish → "Kirish" → login.
// Yaratilgan do'kon nomi "E2E " bilan boshlanadi — global-teardown o'chiradi.
test("sayt → bepul sinash → kabinet → chiqish → qayta kirish", async ({ browser }) => {
  const stamp = Date.now();
  const digits = `33${String(stamp).slice(-7)}`;
  const shop = `E2E Sinov do'koni ${stamp}`;
  const password = "sinov-12345";

  // Har test o'z "IP"si bilan — ariza cheklovi boshqa testlarga ta'sir qilmasin
  const ctx = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": `e2e-signup-${stamp}` },
  });
  const page = await ctx.newPage();

  await page.goto("/");
  await page.getByRole("link", { name: m.nav.trial, exact: true }).first().click();
  await expect(page).toHaveURL(/\/register$/);
  await page.waitForLoadState("networkidle");

  await page.getByLabel(m.lead.name).fill("E2E Egasi");
  await page.getByLabel(m.lead.phone).fill(digits);
  await page.getByLabel(m.lead.city).selectOption("FERGANA");
  await page.getByLabel(m.lead.shop).fill(shop);

  // Qisqa parol — Zod rad etadi, boshqa maydonlar o'chib ketmaydi
  await page.getByLabel(m.signup.password).fill("123");
  await page.getByTestId("consent").check();
  await page.getByRole("button", { name: m.signup.submit }).click();
  await expect(page.getByText(m.signup.errors.passwordShort)).toBeVisible();
  await expect(page.getByLabel(m.lead.shop)).toHaveValue(shop);

  await page.getByLabel(m.signup.password).fill(password);
  await page.getByRole("button", { name: m.signup.submit }).click();

  // Kabinet: do'kon nomi va namunaviy katalog
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(shop).first()).toBeVisible();
  await page.goto("/dashboard/products");
  await expect(page.getByText(STARTER_CATALOG[0].products[0].name).first()).toBeVisible();

  // Chiqish → login sahifasi → "Kirish"
  await page.getByRole("button", { name: uz.auth.logout }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.locator("#phone").fill(digits);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: uz.auth.login }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(shop).first()).toBeVisible();

  // Shu raqam bilan qayta ro'yxatdan o'tib bo'lmaydi
  await page.getByRole("button", { name: uz.auth.logout }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(m.lead.name).fill("E2E Egasi");
  await page.getByLabel(m.lead.phone).fill(digits);
  await page.getByLabel(m.lead.city).selectOption("FERGANA");
  await page.getByLabel(m.signup.password).fill(password);
  await page.getByTestId("consent").check();
  await page.getByRole("button", { name: m.signup.submit }).click();
  await expect(page.getByText(m.signup.errors.phoneTaken)).toBeVisible();

  await ctx.close();
});

test("404: o'zbekcha sahifa va bosh sahifaga qaytish", async ({ page }) => {
  const res = await page.goto("/bunday-sahifa-yoq");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: uz.errorPages.notFoundTitle })).toBeVisible();
  await page.getByRole("link", { name: uz.errorPages.home }).click();
  await expect(page.getByRole("heading", { level: 1, name: m.hero.title })).toBeVisible();
});

test("SEO: robots.txt yopiq bo'limlar, sitemap, OG rasm, sahifa tavsifi", async ({
  page,
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const path of ["/admin", "/dashboard", "/pos"])
    expect(robots).toContain(`Disallow: ${path}`);
  expect(robots).toContain("/sitemap.xml");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/narxlar", "/pilot", "/savollar", "/aloqa"]) expect(sitemap).toContain(path);
  expect(sitemap).not.toContain("/dashboard");

  const og = await request.get("/og-image.png");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");

  await page.goto("/narxlar");
  await expect(page).toHaveTitle(new RegExp(m.seo.pages.pricing.title));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    m.seo.pages.pricing.description,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /og-image\.png$/,
  );

  await page.goto("/");
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
  );
  expect(schema["@type"]).toBe("LocalBusiness");
});

test("cookie xabari: 'Tushunarli' bosilgach qayta chiqmaydi", async ({ page }) => {
  await page.goto("/savollar");
  const notice = page.getByTestId("cookie-notice");
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: m.cookie.ok }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(notice).toHaveCount(0);
});
