/**
 * "Yordam" → "Muammo haqida xabar berish": so'rov bazaga yoziladi va platforma admini
 * Telegramiga boradi. Admin ro'yxati — ISTISNO: barcha do'konlar (faqat SUPER_ADMIN).
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { escapeHtml } from "./telegram/messages";
import { sendToAdmin } from "./telegram/outbox";

export const supportSchema = z.object({
  message: z.string().trim().min(5, uz.support.tooShort).max(2000, uz.validation.tooLong),
  page: z.string().trim().max(300).optional(),
  errorCode: z.string().trim().max(100).optional(),
});
export type SupportInput = z.input<typeof supportSchema>;

export async function createSupportRequest(
  tenantId: string,
  userId: string,
  input: SupportInput,
  deps: { notify?: (html: string) => Promise<unknown> } = { notify: sendToAdmin },
) {
  const data = supportSchema.parse(input);
  const request = await db.supportRequest.create({
    data: { tenantId, userId, ...data },
    include: {
      user: { select: { name: true, phone: true, role: true } },
      tenant: { select: { name: true } },
    },
  });
  const lines = [
    uz.support.notifyTitle,
    `${escapeHtml(request.tenant.name)} · ${escapeHtml(request.user.name)} (${uz.roles[request.user.role]})`,
    escapeHtml(request.user.phone),
    request.page ? `📄 ${escapeHtml(request.page)}` : null,
    request.errorCode ? `⚠️ ${escapeHtml(request.errorCode)}` : null,
    "",
    escapeHtml(request.message),
  ].filter((l) => l !== null);
  try {
    await deps.notify?.(lines.join("\n"));
  } catch (error) {
    console.warn("[support] Telegram:", error instanceof Error ? error.message : error);
  }
  return { id: request.id };
}

export async function listSupportRequests(take = 200) {
  return db.supportRequest.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    take,
    include: {
      user: { select: { name: true, phone: true, role: true } },
      tenant: { select: { name: true } },
    },
  });
}

export async function setSupportResolved(id: string, resolved: boolean) {
  await db.supportRequest.updateMany({ where: { id }, data: { resolved } });
}
