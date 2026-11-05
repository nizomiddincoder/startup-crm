/**
 * To'lov provayderlari interfeysi. Yangi provayder qo'shish:
 * 1) shu faylda PaymentProvider implementatsiya qiling,
 * 2) PROVIDERS ga ro'yxatdan o'tkazing,
 * 3) webhook logikasini app/api/billing/webhooks/[provider]/route.ts ga qo'shing.
 * Click va Payme — stub: imzo tekshiruvi to'liq, lekin real to'lov kalitlari (.env) bo'lmasa ishlatilmaydi.
 */
import crypto from "node:crypto";
import { siteUrl } from "@/lib/site-config";

export type ProviderPayment = {
  id: string;
  amount: number; // so'm
  purpose: string; // "plan:biznes" | "addon:branch" | "module:production"
  months: number;
};

export interface PaymentProvider {
  key: string;
  /** To'lov sahifasi manzili (yo'naltiriladigan) yoki null — faqat webhook orqali. */
  createPayment(payment: ProviderPayment): Promise<{ redirectUrl: string | null }>;
}

function env(name: string): string | null {
  return process.env[name]?.trim() || null;
}

/** Mock: to'lovni webhook orqali "tasdiqlash" sahifasiga yo'naltiradi (faqat dev/test). */
export const mockProvider: PaymentProvider = {
  key: "mock",
  async createPayment(payment) {
    return { redirectUrl: `${siteUrl()}/dashboard/billing/mock-pay?payment=${payment.id}` };
  },
};

/** Click: my.click.uz to'lov sahifasi; webhook imzosi — md5 (verifyClickSignature). */
export const clickProvider: PaymentProvider = {
  key: "click",
  async createPayment(payment) {
    const serviceId = env("CLICK_SERVICE_ID");
    const merchantId = env("CLICK_MERCHANT_ID");
    if (!serviceId || !merchantId) return { redirectUrl: null };
    const url = new URL("https://my.click.uz/services/pay");
    url.searchParams.set("service_id", serviceId);
    url.searchParams.set("merchant_id", merchantId);
    url.searchParams.set("amount", String(payment.amount));
    url.searchParams.set("transaction_param", payment.id);
    url.searchParams.set("return_url", `${siteUrl()}/dashboard/billing`);
    return { redirectUrl: url.toString() };
  },
};

/** Click Prepare/Complete imzosi: md5(click_trans_id + service_id + SECRET + merchant_trans_id + amount + action + sign_time). */
export function verifyClickSignature(params: Record<string, string>): boolean {
  const secret = env("CLICK_SECRET_KEY");
  if (!secret) return false;
  const signString = [
    params.click_trans_id ?? "",
    params.service_id ?? "",
    secret,
    params.merchant_trans_id ?? "",
    params.amount ?? "",
    params.action ?? "",
    params.sign_time ?? "",
  ].join("");
  const computed = crypto.createHash("md5").update(signString).digest("hex");
  return computed === params.sign_string;
}

/** Payme: checkout havolasi (summa tiyinda, base64 qiymat). */
export const paymeProvider: PaymentProvider = {
  key: "payme",
  async createPayment(payment) {
    const merchantId = env("PAYME_MERCHANT_ID");
    if (!merchantId) return { redirectUrl: null };
    const payload = Buffer.from(
      JSON.stringify({ m: merchantId, a: payment.amount * 100, c: `${siteUrl()}/p/${payment.id}` }),
    ).toString("base64");
    return { redirectUrl: `https://checkout.paycom.uz/${payload}` };
  },
};

/** Payme webhook basic auth: "Basic base64(Payme:KEY)". */
export function paymeAuthValid(authorization: string | null): boolean {
  const key = env("PAYME_KEY");
  if (!key || !authorization) return false;
  const expected = `Basic ${Buffer.from(`Payme:${key}`).toString("base64")}`;
  return authorization === expected;
}

export const PROVIDERS: Record<string, PaymentProvider> = {
  mock: mockProvider,
  click: clickProvider,
  payme: paymeProvider,
};

export function getPaymentProvider(key: string): PaymentProvider | null {
  return PROVIDERS[key] ?? null;
}

/** Muhitda sozlangan (ishlatish mumkin) provayder kalitlari. */
export function availableProviders(): string[] {
  const keys = ["mock"];
  if (env("CLICK_SERVICE_ID") && env("CLICK_SECRET_KEY")) keys.push("click");
  if (env("PAYME_MERCHANT_ID") && env("PAYME_KEY")) keys.push("payme");
  return keys;
}
