"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { t, uz } from "@/lib/i18n/uz";
import { assertModule } from "@/lib/services/modules";
import { formatSum } from "@/lib/services/money";
import { setOrderStatus } from "@/lib/services/orders";
import { SECTION_ACCESS } from "@/lib/services/permissions";
import { escapeHtml } from "@/lib/services/telegram/messages";
import { sendTelegram } from "@/lib/services/telegram/outbox";

const MESSAGES = {
  ACCEPTED: uz.bot.orderAccepted,
  READY: uz.bot.orderReady,
  CANCELLED: uz.bot.orderCancelled,
} as const;

/** Qabul / tayyor / bekor — mijozga Telegram xabari (bot ishlamasa ham holat saqlanadi). */
export async function setOrderStatusAction(
  id: string,
  status: keyof typeof MESSAGES,
): Promise<ActionState> {
  const user = await requireUser(SECTION_ACCESS["/pos"]);
  try {
    await assertModule(user.tenantId, "orders");
    const order = await setOrderStatus(user.tenantId, id, status);
    const chatId = order.customer.telegramChatId;
    if (chatId) {
      const text = t(MESSAGES[status], {
        shop: escapeHtml(order.tenant.name),
        number: order.number ?? "",
        total: formatSum(order.total),
        note: order.note ? `\n${escapeHtml(order.note)}` : "",
      });
      await sendTelegram(chatId, text).catch((e) => console.error("[orders] telegram:", e));
    }
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/pos/orders");
  revalidatePath(`/pos/orders/${id}`);
  return { ok: true };
}
