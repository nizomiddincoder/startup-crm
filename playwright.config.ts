import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL berilsa — o'sha (allaqachon ishlayotgan) serverda tekshiradi, masalan:
//   lokal production (npm start) yoki Railway'dagi sayt. Berilmasa — dev server.
const externalUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  // Dev server sahifalarni birinchi ochilishda kompilyatsiya qiladi — vaqt zaxirasi bilan
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 2,
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: externalUrl ?? "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalUrl
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
