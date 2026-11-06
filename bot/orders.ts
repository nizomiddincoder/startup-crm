/**
 * Botda buyurtma berish: do'kon → kategoriya → mahsulot (+1) → savatcha (−/+) → yuborish.
 * Yupqa qatlam: mantiq lib/services/orders.ts'da. Tugma ma'lumoti ≤ 64 bayt:
 *   o:s:<mijoz>                 — kategoriyalar
 *   o:c:<mijoz>:<kategoriya|->:<sahifa>
 *   o:a:<mijoz>:<mahsulot>:<sahifa> — +1 va sahifani yangilash
 *   o:v:<mijoz>  o:+|-:<mijoz>:<mahsulot>  o:x:<mijoz>  o:k:<mijoz>
 * Har tugmada mijoz shu chat'niki ekani qayta tekshiriladi (`orderCustomer`).
 */
import { InlineKeyboard, type Bot, type Context } from "grammy";
import { t, uz } from "@/lib/i18n/uz";
import { getAccountBalances } from "@/lib/services/customers";
import { ServiceError } from "@/lib/services/errors";
import { formatDate, formatQuantity } from "@/lib/services/format";
import { formatAmount, formatSum } from "@/lib/services/money";
import {
  catalogCategories,
  catalogProducts,
  changeDraftItem,
  clearDraft,
  customerOrders,
  customerPurchases,
  customerShopsByChatId,
  getDraft,
  orderCustomer,
  orderStaffChatIds,
  productCategoryId,
  submitDraft,
} from "@/lib/services/orders";
import { escapeHtml } from "@/lib/services/telegram/messages";

const html = { parse_mode: "HTML" as const };
type Shop = NonNullable<Awaited<ReturnType<typeof orderCustomer>>>;

function chatIdOf(ctx: Context) {
  return String(ctx.chat?.id ?? "");
}

async function cartCount(shop: Shop) {
  return (await getDraft(shop.tenantId, shop.id))?.items.length ?? 0;
}

async function categoriesView(shop: Shop) {
  const { categories, uncategorized } = await catalogCategories(shop.tenantId);
  const kb = new InlineKeyboard();
  categories.forEach((c, i) => {
    kb.text(c.name, `o:c:${shop.id}:${c.id}:0`);
    if (i % 2 === 1) kb.row();
  });
  if (categories.length % 2 === 1) kb.row();
  if (uncategorized) kb.text(uz.bot.otherCategory, `o:c:${shop.id}:-:0`).row();
  kb.text(t(uz.bot.cartButton, { count: await cartCount(shop) }), `o:v:${shop.id}`);
  const text =
    categories.length || uncategorized
      ? t(uz.bot.chooseCategory, { shop: escapeHtml(shop.tenant.name) })
      : uz.bot.noProducts;
  return { text, kb };
}

async function productsView(shop: Shop, categoryId: string | null, page: number) {
  const data = await catalogProducts(shop.tenantId, categoryId, page);
  const cat = categoryId ?? "-";
  const kb = new InlineKeyboard();
  for (const p of data.items) {
    const price = p.promoPercent
      ? `${formatSum(p.salePrice)} (−${p.promoPercent}%)`
      : formatSum(p.salePrice);
    kb.text(
      `${p.name} — ${price}/${uz.units[p.unit]}`,
      `o:a:${shop.id}:${p.id}:${data.page}`,
    ).row();
  }
  if (data.pages > 1) {
    if (data.page > 0) kb.text(uz.bot.prev, `o:c:${shop.id}:${cat}:${data.page - 1}`);
    kb.text(`${data.page + 1}/${data.pages}`, `o:c:${shop.id}:${cat}:${data.page}`);
    if (data.page < data.pages - 1) kb.text(uz.bot.next, `o:c:${shop.id}:${cat}:${data.page + 1}`);
    kb.row();
  }
  kb.text(uz.bot.backToCategories, `o:s:${shop.id}`);
  kb.text(t(uz.bot.cartButton, { count: await cartCount(shop) }), `o:v:${shop.id}`);
  const text = data.items.length
    ? t(uz.bot.products, { category: escapeHtml(data.category ?? "") })
    : uz.bot.noProducts;
  return { text, kb };
}

async function cartView(shop: Shop) {
  const draft = await getDraft(shop.tenantId, shop.id);
  const kb = new InlineKeyboard();
  if (!draft || draft.items.length === 0) {
    kb.text(uz.bot.addMore, `o:s:${shop.id}`);
    return { text: uz.bot.cartEmpty, kb };
  }
  const lines = draft.items.map((i) =>
    t(uz.bot.cartLine, {
      name: escapeHtml(i.name),
      quantity: formatQuantity(i.quantity),
      unit: uz.units[i.unit],
      price: formatSum(i.price),
      total: formatSum(i.total),
    }),
  );
  for (const i of draft.items) {
    kb.text("−", `o:-:${shop.id}:${i.productId}`)
      .text(`${i.name.slice(0, 24)} · ${formatQuantity(i.quantity)}`, `o:v:${shop.id}`)
      .text("+", `o:+:${shop.id}:${i.productId}`)
      .row();
  }
  kb.text(uz.bot.addMore, `o:s:${shop.id}`).text(uz.bot.clearCart, `o:x:${shop.id}`).row();
  kb.text(uz.bot.submit, `o:k:${shop.id}`);
  const text = [
    t(uz.bot.cartTitle, { shop: escapeHtml(shop.tenant.name) }),
    "",
    ...lines,
    "",
    t(uz.bot.cartTotal, { total: formatSum(draft.total) }),
  ].join("\n");
  return { text, kb };
}

/** Xabarni joyida yangilaydi (o'zgarmagan bo'lsa Telegram xatosini e'tiborsiz qoldiradi). */
async function show(ctx: Context, view: { text: string; kb: InlineKeyboard }) {
  try {
    await ctx.editMessageText(view.text, { ...html, reply_markup: view.kb });
  } catch (error) {
    if (!String(error).includes("message is not modified")) {
      await ctx.reply(view.text, { ...html, reply_markup: view.kb });
    }
  }
}

export function registerOrderHandlers(bot: Bot) {
  bot.command("buyurtma", async (ctx) => {
    const shops = await customerShopsByChatId(chatIdOf(ctx));
    if (!shops.length) return ctx.reply(uz.bot.notCustomer);
    if (shops.length > 1) {
      const kb = new InlineKeyboard();
      for (const s of shops) kb.text(s.tenant.name, `o:s:${s.id}`).row();
      return ctx.reply(uz.bot.chooseShop, { reply_markup: kb });
    }
    const view = await categoriesView(shops[0]);
    return ctx.reply(view.text, { ...html, reply_markup: view.kb });
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

  bot.callbackQuery(/^o:([scav+\-xk]):([^:]+)(?::([^:]+))?(?::([^:]+))?$/, async (ctx) => {
    const [, action, customerId, a, b] = ctx.match;
    const shop = await orderCustomer(chatIdOf(ctx), customerId);
    if (!shop) {
      await ctx.answerCallbackQuery({ text: uz.bot.orderExpired, show_alert: true });
      return;
    }
    try {
      switch (action) {
        case "s":
          await ctx.answerCallbackQuery();
          return show(ctx, await categoriesView(shop));
        case "c":
          await ctx.answerCallbackQuery();
          return show(ctx, await productsView(shop, a === "-" ? null : a, Number(b) || 0));
        case "a": {
          const added = await changeDraftItem(shop.tenantId, shop.id, a, 1);
          await ctx.answerCallbackQuery({
            text: `${t(uz.bot.added, { name: added.name })} (${formatQuantity(added.quantity)})`,
          });
          const categoryId = await productCategoryId(shop.tenantId, a);
          return show(ctx, await productsView(shop, categoryId, Number(b) || 0));
        }
        case "v":
          await ctx.answerCallbackQuery();
          return show(ctx, await cartView(shop));
        case "+":
        case "-":
          await changeDraftItem(shop.tenantId, shop.id, a, action === "+" ? 1 : -1);
          await ctx.answerCallbackQuery();
          return show(ctx, await cartView(shop));
        case "x":
          await clearDraft(shop.tenantId, shop.id);
          await ctx.answerCallbackQuery({ text: uz.bot.cartCleared });
          return show(ctx, await cartView(shop));
        case "k": {
          const order = await submitDraft(shop.tenantId, shop.id);
          await ctx.answerCallbackQuery();
          await ctx.editMessageText(
            t(uz.bot.submitted, {
              number: order.number ?? "—",
              shop: escapeHtml(shop.tenant.name),
              total: formatSum(order.total),
            }),
            html,
          );
          await notifyStaff(bot, shop, order);
          return;
        }
      }
    } catch (error) {
      const text = error instanceof ServiceError ? error.message : uz.bot.orderExpired;
      if (!(error instanceof ServiceError)) console.error("[bot] buyurtma:", error);
      await ctx.answerCallbackQuery({ text, show_alert: true }).catch(() => {});
    }
  });
}

async function notifyStaff(bot: Bot, shop: Shop, order: Awaited<ReturnType<typeof submitDraft>>) {
  const text = t(uz.bot.newOrderStaff, {
    number: order.number ?? "—",
    customer: escapeHtml(order.customer.name),
    phone: order.customer.phone ? `, ${order.customer.phone}` : "",
    lines: order.lines
      .map(
        (l) =>
          `• ${escapeHtml(l.name)} — ${formatQuantity(l.quantity)} ${uz.units[l.unit]} = ${formatSum(l.total)}`,
      )
      .join("\n"),
    total: formatSum(order.total),
  });
  for (const chatId of await orderStaffChatIds(shop.tenantId)) {
    await bot.api.sendMessage(chatId, text, html).catch((e) => {
      console.error("[bot] buyurtma xabari:", e);
    });
  }
}
