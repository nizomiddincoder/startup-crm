/**
 * Yangiliklar: admin bir marta yozadi → saytda (sahifa + poster), dasturda ("Yangiliklar" oynasi,
 * o'qilmaganlar soni), Telegram kanalida va do'kon egalariga bot xabari sifatida chiqadi.
 * ISTISNO: platforma darajasida (tenantId yo'q) — barcha do'konlarga umumiy.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { t, uz } from "@/lib/i18n/uz";
import { siteUrl } from "@/lib/site-config";
import { ServiceError } from "./errors";
import { escapeHtml } from "./telegram/messages";

const flag = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const newsSchema = z.object({
  title: z.string().trim().min(3, uz.news.titleShort).max(150, uz.validation.tooLong),
  body: z.string().trim().min(10, uz.news.bodyShort).max(5000, uz.validation.tooLong),
  onSite: flag,
  onApp: flag,
  toChannel: flag,
  toOwners: flag,
});
export type NewsInput = z.input<typeof newsSchema>;

/** Ro'yxatlar rasm baytlarisiz (og'ir) — faqat rasm bor-yo'qligi. */
const listSelect = {
  id: true,
  title: true,
  body: true,
  imageMime: true,
  onSite: true,
  onApp: true,
  toChannel: true,
  toOwners: true,
  publishedAt: true,
  channelSentAt: true,
  ownersSentAt: true,
  ownersSentCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type NewsImage = { data: Buffer; mime: string } | null | undefined;

export async function createNews(input: NewsInput, image?: NewsImage) {
  const data = newsSchema.parse(input);
  return db.newsPost.create({
    data: {
      ...data,
      ...(image ? { image: new Uint8Array(image.data), imageMime: image.mime } : {}),
    },
    select: { id: true },
  });
}

/** `image === null` — rasm o'chiriladi; `undefined` — o'zgarmaydi. */
export async function updateNews(id: string, input: NewsInput, image?: NewsImage) {
  const data = newsSchema.parse(input);
  const { count } = await db.newsPost.updateMany({
    where: { id },
    data: {
      ...data,
      ...(image === null ? { image: null, imageMime: null } : {}),
      ...(image ? { image: new Uint8Array(image.data), imageMime: image.mime } : {}),
    },
  });
  if (count === 0) throw new ServiceError(uz.news.notFound);
}

export async function deleteNews(id: string) {
  await db.newsPost.deleteMany({ where: { id } });
}

export async function listAllNews(take = 100) {
  return db.newsPost.findMany({ orderBy: { createdAt: "desc" }, take, select: listSelect });
}

export async function getNews(id: string) {
  return db.newsPost.findUnique({ where: { id }, select: listSelect });
}

/** Chop etilgan yangiliklar: saytda yoki dasturda. */
export async function listPublishedNews(place: "site" | "app", take = 50) {
  return db.newsPost.findMany({
    where: {
      publishedAt: { not: null },
      ...(place === "site" ? { onSite: true } : { onApp: true }),
    },
    orderBy: { publishedAt: "desc" },
    take,
    select: listSelect,
  });
}

export async function getPublishedNews(id: string, place: "site" | "app") {
  return db.newsPost.findFirst({
    where: {
      id,
      publishedAt: { not: null },
      ...(place === "site" ? { onSite: true } : { onApp: true }),
    },
    select: listSelect,
  });
}

/** Saytdagi poster: oxirgi 14 kundagi eng yangi chop etilgan yangilik. */
export async function latestSitePoster(now = new Date(), days = 14) {
  return db.newsPost.findFirst({
    where: {
      publishedAt: { not: null, gte: new Date(now.getTime() - days * 86_400_000) },
      onSite: true,
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true },
  });
}

export async function newsImage(id: string) {
  const post = await db.newsPost.findFirst({
    where: { id, publishedAt: { not: null }, image: { not: null } },
    select: { image: true, imageMime: true },
  });
  return post?.image ? { data: post.image, mime: post.imageMime ?? "image/webp" } : null;
}

/** Admin ko'rishi uchun (chop etilmagan bo'lsa ham). */
export async function newsImageForAdmin(id: string) {
  const post = await db.newsPost.findUnique({
    where: { id },
    select: { image: true, imageMime: true },
  });
  return post?.image ? { data: post.image, mime: post.imageMime ?? "image/webp" } : null;
}

/** Dasturdagi qo'ng'iroqcha: oxirgi ko'rgandan keyin chiqqanlar (yangi xodim — oxirgi 30 kun). */
export async function unreadNewsCount(userId: string, now = new Date()) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { newsSeenAt: true } });
  const since = user?.newsSeenAt ?? new Date(now.getTime() - 30 * 86_400_000);
  return db.newsPost.count({ where: { onApp: true, publishedAt: { gt: since } } });
}

export async function markNewsSeen(userId: string, now = new Date()) {
  await db.user.updateMany({ where: { id: userId }, data: { newsSeenAt: now } });
}

export function newsMessage(post: { id: string; title: string; body: string }) {
  const body = post.body.length > 700 ? `${post.body.slice(0, 700)}…` : post.body;
  return [
    `📢 <b>${escapeHtml(post.title)}</b>`,
    "",
    escapeHtml(body),
    "",
    t(uz.news.readMore, { url: `${siteUrl()}/yangiliklar/${post.id}` }),
  ].join("\n");
}

export type NewsSender = {
  /** Kanal yoki chatga: rasm bo'lsa — rasm + izoh, bo'lmasa — matn */
  send: (chatId: string, html: string, image?: { data: Buffer; mime: string }) => Promise<void>;
  /** Telegram cheklovi (sekundiga ~30 xabar) — xabarlar orasida kutish */
  pause?: () => Promise<void>;
};

/**
 * Chop etish: `publishedAt` qo'yiladi (bir marta), so'ng Telegram — kanal va do'kon egalari.
 * Har biri bir marta yuboriladi (`channelSentAt`, `ownersSentAt`). Kanal: TELEGRAM_NEWS_CHANNEL.
 */
export async function publishNews(id: string, sender: NewsSender | null, now = new Date()) {
  const post = await db.newsPost.findUnique({
    where: { id },
    select: { ...listSelect, image: true },
  });
  if (!post) throw new ServiceError(uz.news.notFound);
  if (!post.publishedAt) await db.newsPost.update({ where: { id }, data: { publishedAt: now } });

  const result = { channel: false, owners: 0 };
  if (!sender) return result;
  const html = newsMessage(post);
  const image = post.image
    ? { data: Buffer.from(post.image), mime: post.imageMime ?? "image/webp" }
    : undefined;

  const channel = process.env.TELEGRAM_NEWS_CHANNEL?.trim();
  if (post.toChannel && channel && !post.channelSentAt) {
    try {
      await sender.send(channel, html, image);
      await db.newsPost.update({ where: { id }, data: { channelSentAt: new Date() } });
      result.channel = true;
    } catch (error) {
      console.warn("[news] kanal:", error instanceof Error ? error.message : error);
    }
  }

  if (post.toOwners && !post.ownersSentAt) {
    const owners = await db.user.findMany({
      where: {
        role: "OWNER",
        isActive: true,
        telegramChatId: { not: null },
        tenant: { isActive: true },
      },
      select: { telegramChatId: true },
    });
    for (const owner of owners) {
      try {
        await sender.send(owner.telegramChatId!, html, image);
        result.owners += 1;
      } catch (error) {
        // Bot bloklangan bo'lishi mumkin — keyingisiga o'tamiz
        console.warn("[news] egasi:", error instanceof Error ? error.message : error);
      }
      await sender.pause?.();
    }
    await db.newsPost.update({
      where: { id },
      data: { ownersSentAt: new Date(), ownersSentCount: result.owners },
    });
  }
  return result;
}
