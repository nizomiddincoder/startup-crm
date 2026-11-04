/**
 * Saytdan kelgan arizalar (Lead). ISTISNO: platforma darajasida — tenantId yo'q.
 * Ariza qabul qilish (spam himoyasi bilan), admin ro'yxati, yangilash, voronka, CSV.
 */
import type { LeadCity, LeadStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import {
  leadSchema,
  leadUpdateSchema,
  LEAD_STATUSES,
  type Attribution,
  type LeadUpdateInput,
} from "@/lib/validation/lead";
import { createLimiter } from "../rate-limit";
import { ServiceError } from "../errors";
import { formatDateTime } from "../format";
import { escapeHtml } from "../telegram/messages";
import { sourceLabel } from "./attribution";

/** Bitta IP'dan 10 daqiqada ko'pi bilan 5 ta ariza. */
export const leadLimiter = createLimiter(5, 10 * 60 * 1000);

/** Bir xil telefondan shu vaqt ichida qayta yuborilsa — yangi ariza ochilmaydi. */
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SubmitContext = {
  ip: string;
  attribution: Attribution;
  now?: Date;
};

export type SubmitDeps = {
  /** Admin'ga Telegram xabari (HTML). Xato bo'lsa ariza baribir saqlanadi. */
  notify?: (html: string) => Promise<void>;
  limiter?: ReturnType<typeof createLimiter>;
};

export type SubmitResult =
  | { status: "created"; id: string }
  | { status: "duplicate"; id: string }
  | { status: "spam" }
  | { status: "rate_limited" };

/** Spam-tuzoq: odam ko'rmaydigan maydon to'ldirilgan bo'lsa — bot. */
export function isHoneypotFilled(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const value = (input as Record<string, unknown>).website;
  return typeof value === "string" && value.trim().length > 0;
}

export function formatLeadNotification(lead: {
  name: string;
  phone: string;
  city: LeadCity;
  shopName: string | null;
  source: string;
  utmSource: string | null;
  utmCampaign: string | null;
  keyword: string | null;
  ref: string | null;
}): string {
  const t = uz.leads;
  const channel = sourceLabel(lead) ?? t.direct;
  const lines = [
    t.notifyTitle,
    "",
    `${t.notifyName}: <b>${escapeHtml(lead.name)}</b>`,
    `${t.notifyPhone}: ${escapeHtml(lead.phone)}`,
    `${t.notifyCity}: ${t.cities[lead.city]}`,
  ];
  if (lead.shopName) lines.push(`${t.notifyShop}: ${escapeHtml(lead.shopName)}`);
  lines.push(
    `${t.notifySource}: ${escapeHtml(channel)}${lead.keyword ? ` (${escapeHtml(lead.keyword)})` : ""}`,
  );
  lines.push(`${t.notifyForm}: ${t.sources[lead.source as keyof typeof t.sources] ?? lead.source}`);
  return lines.join("\n");
}

/**
 * Arizani qabul qilish: spam-tuzoq → IP bo'yicha cheklov → Zod → takrorni tekshirish → baza →
 * admin'ga Telegram. Zod xatosi — tashlanadi (formada maydon ostida ko'rsatiladi).
 */
export async function submitLead(
  input: unknown,
  ctx: SubmitContext,
  deps: SubmitDeps = {},
): Promise<SubmitResult> {
  // Bot uchun "muvaffaqiyat" ko'rinadi, lekin hech narsa saqlanmaydi va hisoblanmaydi
  if (isHoneypotFilled(input)) return { status: "spam" };

  const limiter = deps.limiter ?? leadLimiter;
  const now = ctx.now ?? new Date();
  if (limiter.check(ctx.ip, now.getTime()).blocked) return { status: "rate_limited" };
  limiter.fail(ctx.ip, now.getTime()); // har bir urinish hisoblanadi

  const data = leadSchema.parse(input);

  const recent = await db.lead.findFirst({
    where: { phone: data.phone, createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } },
    select: { id: true },
  });
  if (recent) return { status: "duplicate", id: recent.id };

  const lead = await db.lead.create({
    data: {
      name: data.name,
      phone: data.phone,
      city: data.city,
      shopName: data.shopName,
      message: data.message,
      source: data.source,
      utmSource: ctx.attribution.utmSource,
      utmCampaign: ctx.attribution.utmCampaign,
      keyword: ctx.attribution.keyword,
      ref: ctx.attribution.ref,
      consentAt: data.consent ? now : null,
      createdAt: now,
    },
  });

  if (deps.notify) {
    try {
      await deps.notify(formatLeadNotification(lead));
    } catch (error) {
      console.warn(
        "[leads] Telegram xabari yuborilmadi:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { status: "created", id: lead.id };
}

// ===== Admin =====

export type LeadFilter = { status?: LeadStatus; city?: LeadCity };

function whereOf(filter: LeadFilter): Prisma.LeadWhereInput {
  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.city ? { city: filter.city } : {}),
  };
}

export async function listLeads(filter: LeadFilter = {}, take = 500) {
  return db.lead.findMany({ where: whereOf(filter), orderBy: { createdAt: "desc" }, take });
}

export async function getLead(id: string) {
  return db.lead.findUnique({ where: { id } });
}

export async function updateLead(id: string, input: LeadUpdateInput) {
  const data = leadUpdateSchema.parse(input);
  const { count } = await db.lead.updateMany({
    where: { id },
    data: {
      status: data.status,
      // Sabab faqat "yo'qotildi" holatida saqlanadi
      lostReason: data.status === "LOST" ? (data.lostReason ?? null) : null,
      note: data.note ?? null,
      assignee: data.assignee ?? null,
    },
  });
  if (count === 0) throw new ServiceError(uz.leads.notFound);
}

/** Voronka bosqichlari tartibi (LOST — alohida). */
export const FUNNEL_STAGES = LEAD_STATUSES.filter((s) => s !== "LOST");

export type FunnelRow = { status: LeadStatus; current: number; reached: number; percent: number };

/**
 * Har bosqich: hozir shu holatdagilar va shu bosqichga YETGANlar (shu yoki keyingi bosqichda).
 * Foiz — jami arizalarga nisbatan (yo'qotilganlar ham jami ichida).
 */
export function computeFunnel(counts: Partial<Record<LeadStatus, number>>) {
  const total = LEAD_STATUSES.reduce((s, st) => s + (counts[st] ?? 0), 0);
  const rows: FunnelRow[] = FUNNEL_STAGES.map((status, i) => {
    const reached = FUNNEL_STAGES.slice(i).reduce((s, st) => s + (counts[st] ?? 0), 0);
    return {
      status,
      current: counts[status] ?? 0,
      reached,
      percent: total ? Math.round((reached / total) * 1000) / 10 : 0,
    };
  });
  return { total, lost: counts.LOST ?? 0, rows };
}

export async function leadFunnel() {
  const groups = await db.lead.groupBy({ by: ["status"], _count: true });
  return computeFunnel(Object.fromEntries(groups.map((g) => [g.status, g._count])));
}

/** Manba bo'yicha: jami arizalar va to'lagani. */
export async function leadsBySource() {
  const leads = await db.lead.findMany({
    select: { utmSource: true, utmCampaign: true, ref: true, status: true },
  });
  const map = new Map<string, { label: string; total: number; paid: number }>();
  for (const l of leads) {
    const label = sourceLabel(l) ?? uz.leads.direct;
    const row = map.get(label) ?? { label, total: 0, paid: 0 };
    row.total++;
    if (l.status === "PAID") row.paid++;
    map.set(label, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// ===== CSV (Google Sheets CRM uchun) =====

function csvCell(value: string | null | undefined): string {
  const s = value ?? "";
  // Formula sifatida o'qilmasin (=, +, -, @ bilan boshlansa) — CSV injection himoyasi
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function leadsToCsv(leads: Awaited<ReturnType<typeof listLeads>>): string {
  const t = uz.leads;
  const header = [
    t.createdAt,
    t.name,
    t.phone,
    t.city,
    t.shop,
    t.status,
    t.lostReason,
    t.assignee,
    t.note,
    t.form,
    "utm_source",
    "utm_campaign",
    "keyword",
    "ref",
  ];
  const rows = leads.map((l) => [
    formatDateTime(l.createdAt),
    l.name,
    l.phone,
    t.cities[l.city],
    l.shopName,
    t.statuses[l.status],
    l.lostReason,
    l.assignee,
    l.note,
    t.sources[l.source as keyof typeof t.sources] ?? l.source,
    l.utmSource,
    l.utmCampaign,
    l.keyword,
    l.ref,
  ]);
  // BOM — Excel/Sheets o'zbekcha harflarni (ʻ, ') to'g'ri ochishi uchun
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
