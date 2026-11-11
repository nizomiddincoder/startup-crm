import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { t, uz } from "../lib/i18n/uz";

// Seed: demo do'kon, Qora shokolad 70% — 14 000 so'm / dona. Menejer 902222222, kassir 903333333.
const CEMENT_NAME = "Qora shokolad 70%, 100 g";

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.locator("#phone").fill(phone);
  await page.locator("#password").fill("demo1234");
  await page.getByRole("button", { name: uz.auth.login }).click();
  await page.waitForURL(/\/(dashboard|pos|admin)/);
}

test.describe.configure({ mode: "serial" });

test("marketing: keshbek, aksiya → kassada chegirmali narx; Telegram buyurtmasi → sotuv", async ({
  browser,
}) => {
  const prisma = new PrismaClient();
  const manager = await browser.newPage();
  const cashier = await browser.newPage();
  try {
    // 1) Menejer: keshbek 5% va shokoladga 10% aksiya
    await login(manager, "902222222");
    await manager.goto("/dashboard/marketing");
    await manager.getByLabel(uz.promotions.cashbackPercent).fill("5");
    await manager.getByRole("button", { name: uz.common.save }).click();
    await expect(manager.getByText(uz.promotions.saved)).toBeVisible();

    await manager.getByLabel(uz.promotions.name).fill("E2E aksiya");
    await manager.getByLabel(uz.promotions.percent).fill("10");
    await manager.getByLabel(uz.promotions.target).selectOption("product");
    await manager.getByLabel(uz.promotions.product).selectOption({ label: CEMENT_NAME });
    await manager.getByRole("button", { name: uz.promotions.add }).click();
    const row = manager.getByTestId("promo-row").filter({ hasText: "E2E aksiya" });
    await expect(row).toContainText(uz.promotions.active);

    // 2) Botdan kelgan buyurtma (bot o'rniga bazaga yozamiz): 2 dona shokolad
    const cement = await prisma.product.findFirstOrThrow({
      where: { tenantId: "demo-shop", name: CEMENT_NAME },
    });
    const customer = await prisma.customer.create({
      data: { tenantId: "demo-shop", name: "E2E Buyurtmachi", phone: "+998919990011" },
    });
    const { lastOrderNumber } = await prisma.tenant.update({
      where: { id: "demo-shop" },
      data: { lastOrderNumber: { increment: 1 } },
    });
    const order = await prisma.order.create({
      data: {
        tenantId: "demo-shop",
        customerId: customer.id,
        status: "NEW",
        number: lastOrderNumber,
        total: 25_200,
        submittedAt: new Date(),
        items: {
          create: {
            productId: cement.id,
            name: cement.name,
            unit: cement.unit,
            // Bot buyurtmani aksiya narxida yozadi (14 000 × 90%)
            price: 12_600,
            quantity: "2",
          },
        },
      },
    });

    // 3) Kassir: buyurtmalar ro'yxati → qabul → kassaga yuklash → aksiya narxida sotish
    await login(cashier, "903333333");
    await expect(cashier.getByTestId("badge-orders")).toBeVisible();
    await cashier.goto(`/pos/orders/${order.id}`);
    await cashier.getByRole("button", { name: uz.orders.accept }).click();
    await expect(cashier.getByTestId("order-status")).toHaveText(uz.orders.statuses.ACCEPTED);
    await cashier.getByRole("link", { name: uz.orders.loadToPos }).click();
    await cashier.waitForURL(/\/pos$/);
    await expect(cashier.getByTestId("cart-order")).toContainText("E2E Buyurtmachi");
    // 2 × 12 600 (10% aksiya)
    await expect(cashier.getByTestId("cart-total")).toHaveText("25 200 so'm");
    await expect(cashier.getByTestId("promo-badge").first()).toBeVisible();

    await cashier.keyboard.press("F2");
    await cashier.getByRole("button", { name: uz.pos.confirmSale }).click();
    await expect(cashier.getByTestId("sale-done")).toBeVisible();
    // Keshbek 5%: 25 200 × 5% = 1 260 ball
    await expect(cashier.getByTestId("points-earned")).toHaveText(
      t(uz.promotions.earned, { points: "1 260" }),
    );
    const done = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(done.status).toBe("DONE");

    // 4) Mijoz kartochkasida ballar
    await cashier.goto(`/pos/customers/${customer.id}`);
    await expect(cashier.getByTestId("customer-points")).toHaveText("1 260");
  } finally {
    // Demo do'konni asl holiga qaytaramiz
    await prisma.tenant.update({ where: { id: "demo-shop" }, data: { cashbackPercent: null } });
    await prisma.promotion.deleteMany({
      where: { tenantId: "demo-shop", name: { startsWith: "E2E " } },
    });
    await prisma.$disconnect();
    await manager.close();
    await cashier.close();
  }
});
