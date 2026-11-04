import { describe, expect, it } from "vitest";
import { t, uz } from "@/lib/i18n/uz";
import {
  escapeHtml,
  formatCustomerReminder,
  formatDailyReport,
  formatMorningDigest,
  type DailyReportData,
} from "./messages";

const date = new Date("2026-10-25T15:00:00Z");

const report: DailyReportData = {
  shop: "Demo <Do'kon>",
  date,
  salesCount: 12,
  revenue: 4_350_000,
  discount: 50_000,
  byMethod: { CASH: 2_000_000, CARD: 1_350_000, TRANSFER: 0, DEBT: 1_000_000 },
  debtCollected: 300_000,
  bonusAccrued: 45_000,
  totalDebt: 7_800_000,
  overdueAmount: 1_200_000,
  overdueCustomers: 2,
  lowStock: [{ name: "Sement M500", balance: "15", unit: "BAG" }],
  lowStockCount: 1,
};

describe("telegram xabarlari", () => {
  it("t() shablonni to'ldiradi", () => {
    expect(t("Salom, {name}! {n} ta", { name: "Ali", n: 3 })).toBe("Salom, Ali! 3 ta");
  });

  it("HTML belgilarni xavfsiz qiladi", () => {
    expect(escapeHtml("<b>A & B</b>")).toBe("&lt;b&gt;A &amp; B&lt;/b&gt;");
  });

  it("kunlik hisobotda asosiy raqamlar bor, nol summalar yo'q", () => {
    const html = formatDailyReport(report);
    expect(html).toContain("Demo &lt;Do'kon&gt;");
    expect(html).toContain("25.10.2026");
    expect(html).toContain("4 350 000 so'm");
    expect(html).toContain(`${uz.paymentMethods.DEBT}: 1 000 000 so'm`);
    expect(html).not.toContain(uz.paymentMethods.TRANSFER);
    expect(html).toContain("300 000 so'm");
    expect(html).toContain("Sement M500: 15 qop");
  });

  it("sotuv bo'lmagan kun", () => {
    const html = formatDailyReport({ ...report, salesCount: 0, revenue: 0, discount: 0 });
    expect(html).toContain(uz.bot.noSales);
  });

  it("ertalabki xulosa: bo'sh va to'liq", () => {
    expect(formatMorningDigest("Do'kon", date, [], [])).toContain(uz.bot.digestNone);
    const rows = Array.from({ length: 12 }, (_, i) => ({
      name: `Mijoz ${i}`,
      phone: null,
      amount: 1000 * (i + 1),
      date: null,
    }));
    const html = formatMorningDigest("Do'kon", date, rows, []);
    expect(html).toContain("Mijoz 9");
    expect(html).not.toContain("Mijoz 10");
    expect(html).toContain(t(uz.bot.digestMore, { count: 2 }));
  });

  it("mijozga eslatma: o'tgan va bugungi qism, do'kon telefoni", () => {
    const html = formatCustomerReminder("Demo", "+998 90 111 11 11", {
      total: 150000,
      overdue: 100000,
      dueToday: 50000,
      dueTomorrow: 0,
      nextDue: null,
      oldestOverdue: new Date("2026-10-19T19:00:00Z"),
    });
    expect(html).toContain("150 000 so'm");
    expect(html).toContain("20.10.2026");
    expect(html).toContain("50 000 so'm");
    expect(html).toContain("+998 90 111 11 11");
  });
});
