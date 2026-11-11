/**
 * AI yordamchi ("Yordam" oynasida): dasturdan qanday foydalanishni o'zbekcha, qisqa qadamlar
 * bilan tushuntiradi. Faqat yo'riqnoma (lib/assistant/guide.uz.ts) — do'konning savdo
 * ma'lumotlarini O'QIMAYDI (xavfsiz va arzon). Kunlik limit — do'kon bo'yicha.
 */
import { z } from "zod";
import { ASSISTANT_GUIDE } from "@/lib/assistant/guide.uz";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { ServiceError } from "./errors";
import { geminiConfig, geminiText, type ChatTurn } from "./images/gemini";
import { hasModule } from "./modules";
import type { Role } from "./permissions";
import { tashkentDayRange } from "./sales";

export const assistantSchema = z.object({
  question: z.string().trim().min(2, uz.assistant.tooShort).max(1000, uz.validation.tooLong),
  history: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().max(4000) }))
    .max(12)
    .default([]),
});
export type AssistantInput = z.input<typeof assistantSchema>;

export function assistantDailyLimit() {
  const limit = Number(process.env.ASSISTANT_DAILY_LIMIT);
  return Number.isInteger(limit) && limit > 0 ? limit : 100;
}

export function assistantEnabled() {
  return !!geminiConfig().apiKey;
}

export function systemPrompt(role: Role) {
  return [
    "Sen — shokolad savdo markazi dasturining yordamchisisan. Faqat o'zbek tilida (lotin), sodda so'zlar bilan javob ber.",
    `Foydalanuvchining roli: ${uz.roles[role]}. Faqat shu rol qila oladigan narsani tavsiya qil; ruxsati bo'lmasa — kimdan so'rashni ayt.`,
    "Javob: qisqa, 1–6 qadam, tugma va menyu nomlarini aynan qo'shtirnoqda yoz (masalan «To'lov (F2)»).",
    "Faqat quyidagi yo'riqnomaga tayan. Bilmasang yoki dasturda yo'q narsa so'ralsa — to'qib chiqarma: «Bu haqda aniq ma'lumot yo'q — «Yordam» → «Muammo haqida xabar berish» orqali yozing» de.",
    "Dasturga aloqasi yo'q savollarga qisqa rad javob ber. Parol, karta raqami kabi maxfiy ma'lumot so'rama.",
    "",
    "YO'RIQNOMA:",
    ASSISTANT_GUIDE,
  ].join("\n");
}

export async function askAssistant(
  ctx: { tenantId: string; userId: string; role: Role },
  input: AssistantInput,
  deps: { ai?: typeof geminiText } = {},
  now = new Date(),
) {
  if (!assistantEnabled()) throw new ServiceError(uz.assistant.disabled);
  if (ctx.role !== "SUPER_ADMIN" && !(await hasModule(ctx.tenantId, "ai"))) {
    throw new ServiceError(uz.assistant.disabled);
  }
  const data = assistantSchema.parse(input);
  const { from } = tashkentDayRange(now);
  const used = await db.aiGeneration.count({
    where: { tenantId: ctx.tenantId, kind: "assistant", createdAt: { gte: from } },
  });
  if (used >= assistantDailyLimit()) throw new ServiceError(uz.assistant.limit);

  const turns: ChatTurn[] = [...data.history, { role: "user", text: data.question }];
  try {
    const answer = await (deps.ai ?? geminiText)(systemPrompt(ctx.role), turns);
    await db.aiGeneration.create({ data: { tenantId: ctx.tenantId, kind: "assistant", ok: true } });
    return answer;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.aiGeneration.create({
      data: { tenantId: ctx.tenantId, kind: "assistant", ok: false, error: message.slice(0, 500) },
    });
    console.warn("[assistant]", message);
    throw new ServiceError(uz.assistant.failed);
  }
}
