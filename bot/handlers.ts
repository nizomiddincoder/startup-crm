/**
 * Bot buyruqlari. Faqat "yupqa" qatlam: barcha mantiq lib/services/telegram'da.
 */
import { Keyboard, type Bot, type Context } from "grammy";
import { t, uz } from "@/lib/i18n/uz";
import { formatDate, formatDateTime } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { canReceiveReports } from "@/lib/services/permissions";
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
  linkStaffByPhone,
} from "@/lib/services/telegram/linking";
import { answerChallenge } from "@/lib/services/telegram/login-confirm";
import {
  escapeHtml,
  formatDailyReport,
  formatMorningDigest,
} from "@/lib/services/telegram/messages";
import { buildDailyReport, buildMorningDigest } from "@/lib/services/telegram/reports";
import { registerOrderHandlers } from "./orders";

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
    // Kassada ko'rsatilgan QR: mijoz raqamini tasdiqlash
    if (param.startsWith("v_")) {
      const opened = await openVerification(param.slice(2), chatIdOf(ctx));
      if (!opened) return ctx.reply(uz.bot.verifyExpired);
      return ctx.reply(t(uz.bot.verifyStart, { shop: opened.shop }), {
        reply_markup: contactKeyboard,
      });
    }
    // Eski usul: saytdan olingan bir martalik kod
    if (param) {
      const linked = await consumeLinkCode(param, chatIdOf(ctx));
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
    const staff = await getStaffByChatId(chatIdOf(ctx));
    if (staff) {
      return ctx.reply(
        t(uz.bot.welcomeStaff, { name: staff.name, shop: staff.tenant.name }) +
          `\n\n${uz.bot.help}`,
      );
    }
    return ctx.reply(uz.bot.welcomeAll, { reply_markup: contactKeyboard });
  });

  // Odam o'z raqamini yuboradi (boshqa odamning kontaktini yuborib bo'lmaydi). Tartib:
  // 1) kassadagi tasdiqlash (QR) → kod; 2) xodim → ulanadi; 3) mijoz → nasiya eslatmalari.
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

    const replies: string[] = [];
    const staff = await linkStaffByPhone(contact.phone_number, chatId);
    if (staff) {
      replies.push(
        t(uz.bot.staffLinkedByPhone, {
          name: staff.name,
          role: uz.roles[staff.role],
          shop: staff.shop,
        }),
      );
      if (canReceiveReports(staff.role)) {
        replies.push(
          t(uz.bot.staffReportsHint, {
            reportHour: config.reportHour,
            reminderHour: config.reminderHour,
          }),
        );
      }
    }
    const shops = await linkCustomerByPhone(contact.phone_number, chatId);
    if (shops.length) {
      replies.push(t(uz.bot.customerLinked, { shops: shops.join(", ") }), uz.bot.customerHelp);
    }
    if (!replies.length) return ctx.reply(uz.bot.nothingFound, removeKeyboard);
    return ctx.reply(replies.join("\n\n"), removeKeyboard);
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
  { command: "buyurtma", description: "Buyurtma berish" },
  { command: "buyurtmalarim", description: "Buyurtmalarim" },
  { command: "xaridlarim", description: "Xaridlarim va ballarim" },
  { command: "qarz", description: "Mening qarzim" },
  { command: "hisobot", description: "Bugungi hisobot (do'kon)" },
  { command: "qarzdorlar", description: "Nasiya xulosasi (do'kon)" },
  { command: "help", description: "Yordam" },
];
