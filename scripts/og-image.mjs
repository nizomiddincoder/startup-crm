// Open Graph rasmini yaratadi: http://localhost:3000/og (app/og/page.tsx) → public/og-image.png
// Ishlatish: avval `npm run dev`, keyin boshqa terminalda `npm run og`.
// Brend nomi, sarlavha yoki ranglar o'zgarsa — qayta ishga tushiring va natijani commit qiling.
import { chromium } from "@playwright/test";

const base = process.env.OG_BASE_URL ?? "http://localhost:3000";
const out = "public/og-image.png";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`${base}/og`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#og").screenshot({ path: out });
  console.log(`[og] Tayyor: ${out}`);
} finally {
  await browser.close();
}
