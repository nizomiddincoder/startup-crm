/**
 * Yangi buyurtma haqida do'kon xodimlariga (egasi/menejer, Telegram ulagan) xabar.
 * Buyurtma bot yoki Mini App'dan yuborilganda chaqiriladi.
 */
import { t, uz } from "@/lib/i18n/uz";
import { formatQuantity } from "@/lib/services/format";
import { formatSum } from "@/lib/services/money";
import { orderStaffChatIds, type submitDraft } from "@/lib/services/orders";
import { escapeHtml } from "./messages";
import { sendTelegram } from "./outbox";

type SubmittedOrder = Awaited<ReturnType<typeof submitDraft>>;

export async function notifyStaffOfOrder(tenantId: string, order: SubmittedOrder) {
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
  for (const chatId of await orderStaffChatIds(tenantId)) {
    await sendTelegram(chatId, text).catch((e) => {
      console.error("[telegram] buyurtma xabari:", e);
    });
  }
}
