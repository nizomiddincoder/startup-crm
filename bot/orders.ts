/**
 * Mijoz buyruqlari: /buyurtma (do'kon ilovasini ochadi), /buyurtmalarim, /xaridlarim.
 * Buyurtma berish — Telegram Mini App orqali (app/miniapp). Yupqa qatlam: mantiq lib/services'da.
 */
import { InlineKeyboard, type Bot, type Context } from "grammy";
import { t, uz } from "@/lib/i18n/uz";
import { getAccountBalances } from "@/lib/services/customers";
import { formatDate } from "@/lib/services/format";
import { formatAmount, formatSum } from "@/lib/services/money";
import { customerOrders, customerPurchases, customerShopsByChatId } from "@/lib/services/orders";
import { escapeHtml } from "@/lib/services/telegram/messages";
import { miniAppUrl } from "@/lib/site-config";

const html = { parse_mode: "HTML" as const };

function chatIdOf(ctx: Context) {
  return String(ctx.chat?.id ?? "");
}

/** "Do'konni ochish" tugmasi — Mini App shu tugma orqali ochiladi. */
export function openShopKeyboard() {
  return new InlineKeyboard().webApp(uz.bot.openShop, miniAppUrl());
}

export function registerOrderHandlers(bot: Bot) {
  bot.command("buyurtma", async (ctx) => {
    const shops = await customerShopsByChatId(chatIdOf(ctx));
    if (!shops.length) return ctx.reply(uz.bot.notCustomer);
    return ctx.reply(uz.bot.orderHint, { reply_markup: openShopKeyboard() });
  });

  bot.command("buyurtmalarim", async (ctx) => {
    const shops = await customerShopsByChatId(chatIdOf(ctx));
    if (!shops.length) return ctx.reply(uz.bot.notCustomer);
    const orders = await customerOrders(shops.map((s) => s.id));
    if (!orders.length) return ctx.reply(uz.bot.myOrdersEmpty);
    const lines = orders.map((o) =>
      t(uz.bot.myOrderLine, {
        number: o.number ?? "—",
        date: o.submittedAt ? formatDate(o.submittedAt) : "—",
        total: formatSum(o.total),
        status: uz.orders.statuses[o.status],
        shop: escapeHtml(o.tenant.name),
      }),
    );
    return ctx.reply(lines.join("\n"), html);
  });

  bot.command("xaridlarim", async (ctx) => {
    const shops = await customerShopsByChatId(chatIdOf(ctx));
    if (!shops.length) return ctx.reply(uz.bot.notCustomer);
    const sales = await customerPurchases(shops.map((s) => s.id));
    const lines = sales.map((s) =>
      t(uz.bot.myPurchaseLine, {
        number: s.number,
        date: formatDate(s.createdAt),
        total: formatSum(s.total),
        shop: escapeHtml(s.tenant.name),
      }),
    );
    // Bonus ballari (keshbek) — do'kon bo'yicha
    for (const s of shops) {
      const points = (await getAccountBalances(s.tenantId, [s.id])).get(s.id)?.points ?? 0;
      if (points > 0) {
        lines.push(
          t(uz.bot.pointsLine, { shop: escapeHtml(s.tenant.name), points: formatAmount(points) }),
        );
      }
    }
    return ctx.reply(lines.length ? lines.join("\n") : uz.bot.myPurchasesEmpty, html);
  });
}
