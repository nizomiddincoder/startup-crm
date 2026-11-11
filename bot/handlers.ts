/**
 * Bot buyruqlari. Faqat "yupqa" qatlam: barcha mantiq lib/services/telegram'da.
 * Botga yozadigan odam — mijoz (ism, familiya va telefon bilan ro'yxatdan o'tadi).
 * Xodimlar hisobot va kirish tasdig'i uchun faqat saytdagi kod orqali ulanadi.
 */
import { Keyboard, type Bot, type Context } from "grammy";
import { t, uz } from "@/lib/i18n/uz";
import { formatDate, formatDateTime } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { canReceiveReports } from "@/lib/services/permissions";
import { customerShopsByChatId } from "@/lib/services/orders";
import { telegramConfig } from "@/lib/services/telegram/config";
import {
  openVerification,
  VERIFY_TTL_MS,
  verificationContact,
} from "@/lib/services/telegram/customer-verify";
import {
  consumeLinkCode,
  customerDebtsByChatId,
  getStaffByChatId,
  linkCustomerByPhone,
} from "@/lib/services/telegram/linking";
import { answerChallenge } from "@/lib/services/telegram/login-confirm";
import {
  escapeHtml,
  formatDailyReport,
  formatMorningDigest,
} from "@/lib/services/telegram/messages";
import {
  clearRegistration,
  getRegistration,
  parseFullName,
  parseShopParam,
  registerCustomerByChat,
  resolveShop,
  setRegistrationName,
  startRegistration,
} from "@/lib/services/telegram/registration";
import { buildDailyReport, buildMorningDigest } from "@/lib/services/telegram/reports";
import { openShopKeyboard, registerOrderHandlers } from "./orders";

const html = { parse_mode: "HTML" as const };

const contactKeyboard = new Keyboard().requestContact(uz.bot.shareContact).resized().oneTime();
const removeKeyboard = { reply_markup: { remove_keyboard: true as const } };

function chatIdOf(ctx: Context) {
  return String(ctx.chat?.id ?? "");
}

/** Faqat egasi/menejer — hisobot buyruqlari uchun. */
async function requireManager(ctx: Context) {
  const staff = await getStaffByChatId(chatIdOf(ctx));
  if (!staff || !canReceiveReports(staff.role)) {
    await ctx.reply(uz.bot.staffOnly);
    return null;
  }
  return staff;
}

export function registerHandlers(bot: Bot) {
  const config = telegramConfig();
  const send = async (chatId: string, text: string) => {
    await bot.api.sendMessage(chatId, text, html);
  };

  bot.command("start", async (ctx) => {
    const param = ctx.match.trim();
    const chatId = chatIdOf(ctx);

    // Kassadagi QR: mijoz raqamini tasdiqlash
    if (param.startsWith("v_")) {
      const opened = await openVerification(param.slice(2), chatId);
      if (!opened) return ctx.reply(uz.bot.verifyExpired);
      return ctx.reply(t(uz.bot.verifyStart, { shop: opened.shop }), {
        reply_markup: contactKeyboard,
      });
    }
    // Xodimni saytdagi bir martalik kod bilan ulash
    if (param && !parseShopParam(param)) {
      const linked = await consumeLinkCode(param, chatId);
      if (!linked) return ctx.reply(uz.bot.linkInvalid);
      return ctx.reply(
        t(uz.bot.staffLinked, {
          name: linked.name,
          shop: linked.shop,
          reportHour: config.reportHour,
          reminderHour: config.reminderHour,
        }) + `\n\n${uz.bot.help}`,
      );
    }

    const staff = await getStaffByChatId(chatId);
    if (staff) {
      return ctx.reply(
        t(uz.bot.welcomeStaff, { name: staff.name, shop: staff.tenant.name }) +
          `\n\n${uz.bot.help}`,
      );
    }

    // Allaqachon mijoz bo'lsa — qayta ro'yxatdan o'tkazmaymiz
    const shops = await customerShopsByChatId(chatId);
    if (shops.length) {
      clearRegistration(chatId);
      return ctx.reply(
        t(uz.bot.welcomeCustomer, { shops: shops.map((s) => escapeHtml(s.tenant.name)).join(", ") }),
        { ...html, reply_markup: openShopKeyboard() },
      );
    }

    const shop = await resolveShop(param);
    if (!shop) return ctx.reply(uz.bot.shopNotFound);
    startRegistration(chatId, shop.id);
    return ctx.reply(t(uz.bot.askName, { shop: escapeHtml(shop.name) }), {
      ...html,
      ...removeKeyboard,
    });
  });

  // Ro'yxatdan o'tish: ism familiya matn bilan
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text;
    // Buyruqlar (/hisobot, /qarz ...) keyingi ishlovchilarga o'tadi — bu yerda to'xtatilmaydi
    if (text.startsWith("/")) return next();
    const chatId = chatIdOf(ctx);
    const reg = getRegistration(chatId);
    if (!reg) return ctx.reply(uz.bot.startHint);
    if (reg.step === "name") {
      const name = parseFullName(text);
      if (!name) return ctx.reply(uz.bot.nameInvalid);
      setRegistrationName(chatId, name);
      return ctx.reply(t(uz.bot.askPhone, { name: escapeHtml(name) }), {
        ...html,
        reply_markup: contactKeyboard,
      });
    }
    return ctx.reply(uz.bot.askPhoneButton, { reply_markup: contactKeyboard });
  });

  // Odam o'z raqamini yuboradi (boshqa odamning kontaktini yuborib bo'lmaydi). Tartib:
  // 1) kassadagi tasdiqlash (QR) → kod; 2) ro'yxatdan o'tish → mijoz yaratiladi;
  // 3) ro'yxatdan o'tmagan, lekin do'konda mavjud mijoz → chat ulanadi.
  bot.on("message:contact", async (ctx) => {
    const contact = ctx.message.contact;
    if (contact.user_id !== ctx.from.id) {
      return ctx.reply(uz.bot.notOwnContact, { reply_markup: contactKeyboard });
    }
    const chatId = chatIdOf(ctx);

    const verification = await verificationContact(chatId, contact.phone_number);
    if (verification && "mismatch" in verification) {
      return ctx.reply(uz.bot.verifyMismatch, removeKeyboard);
    }
    if (verification) {
      await linkCustomerByPhone(contact.phone_number, chatId);
      return ctx.reply(
        t(uz.bot.verifyCode, {
          code: verification.code,
          minutes: Math.round(VERIFY_TTL_MS / 60_000),
        }),
        { ...html, ...removeKeyboard },
      );
    }

    const reg = getRegistration(chatId);
    if (reg?.step === "phone") {
      const result = await registerCustomerByChat({
        tenantId: reg.tenantId,
        name: reg.name,
        phone: contact.phone_number,
        chatId,
      });
      clearRegistration(chatId);
      if (!result) return ctx.reply(uz.bot.registerFailed, removeKeyboard);
      return ctx.reply(
        t(uz.bot.registered, { name: escapeHtml(result.name), shop: escapeHtml(result.shop) }),
        { ...html, reply_markup: openShopKeyboard() },
      );
    }

    const shops = await linkCustomerByPhone(contact.phone_number, chatId);
    if (shops.length) {
      return ctx.reply(
        t(uz.bot.customerLinked, { shops: shops.map(escapeHtml).join(", ") }) +
          `\n\n${uz.bot.customerHelp}`,
        { ...html, reply_markup: openShopKeyboard() },
      );
    }
    return ctx.reply(uz.bot.notRegistered, removeKeyboard);
  });

  // Kirishni tasdiqlash tugmalari: login:ok:<id> / login:no:<id>
  bot.callbackQuery(/^login:(ok|no):(.+)$/, async (ctx) => {
    const [, action, id] = ctx.match;
    const result = await answerChallenge(id, chatIdOf(ctx), action === "ok");
    const time = formatDateTime(new Date());
    if (!result) {
      await ctx.answerCallbackQuery({ text: uz.bot.loginExpired, show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      result === "APPROVED" ? t(uz.bot.loginApproved, { time }) : t(uz.bot.loginDenied, { time }),
    );
  });

  // Talab bo'yicha — faqat so'ragan odamga (sozlamadagi "kunlik hisobot" belgisidan qat'i nazar)
  bot.command("hisobot", async (ctx) => {
    const staff = await requireManager(ctx);
    if (!staff) return;
    const report = await buildDailyReport(staff.tenantId, new Date());
    return ctx.reply(formatDailyReport(report), html);
  });

  bot.command("qarzdorlar", async (ctx) => {
    const staff = await requireManager(ctx);
    if (!staff) return;
    const now = new Date();
    const d = await buildMorningDigest(staff.tenantId, now);
    return ctx.reply(formatMorningDigest(d.shop, now, d.overdue, d.dueToday), html);
  });

  bot.command("qarz", async (ctx) => {
    const debts = await customerDebtsByChatId(chatIdOf(ctx), new Date());
    if (!debts.length) return ctx.reply(uz.bot.noDebts);
    const lines = debts.map((d) =>
      t(uz.bot.customerDebtLine, {
        shop: escapeHtml(d.shop),
        amount: formatSum(d.debt),
        due: d.nextDue ? t(uz.bot.dueSuffix, { date: formatDate(d.nextDue) }) : "",
      }),
    );
    return ctx.reply(lines.join("\n"), html);
  });

  bot.command("help", (ctx) => ctx.reply(`${uz.bot.help}\n\n${uz.bot.customerHelp}`));

  registerOrderHandlers(bot);

  return send;
}

export const botCommands = [
  { command: "start", description: "Boshlash va ro'yxatdan o'tish" },
  { command: "buyurtma", description: "Buyurtma berish (do'kon ilovasi)" },
  { command: "buyurtmalarim", description: "Buyurtmalarim" },
  { command: "xaridlarim", description: "Xaridlarim va ballarim" },
  { command: "qarz", description: "Mening qarzim" },
  { command: "hisobot", description: "Bugungi hisobot (do'kon)" },
  { command: "qarzdorlar", description: "Nasiya xulosasi (do'kon)" },
  { command: "help", description: "Yordam" },
];
