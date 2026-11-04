"use server";

import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { signIn } from "@/auth";
import { TRACK_COOKIE, type TrackEvent } from "@/lib/analytics";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { ServiceError } from "@/lib/services/errors";
import { ATTRIBUTION_COOKIE, parseAttributionCookie } from "@/lib/services/leads/attribution";
import { submitLead, type SubmitContext, type SubmitDeps } from "@/lib/services/leads/leads";
import { adminLeadNotifier } from "@/lib/services/leads/notify";
import { selfSignup } from "@/lib/services/leads/signup";

export type LeadFormState = {
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
  values?: Record<string, string>;
};

/**
 * Mijoz IP'si (spam cheklovi uchun). X-Forwarded-For'ning OXIRGI qiymati — uni proksi (Railway)
 * qo'shadi. Birinchi qiymatni mijozning o'zi yozib yuborishi mumkin (cheklovni aylanib o'tish).
 */
async function clientIp() {
  const h = await headers();
  const chain = h
    .get("x-forwarded-for")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chain?.at(-1) || h.get("x-real-ip") || "local";
}

/** Formadagi matn maydonlari. Parol javobda brauzerga qaytarilmaydi. */
function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  });
  const safe = { ...values };
  delete safe.password;
  return { values, safe };
}

async function submitContext(): Promise<SubmitContext> {
  return {
    ip: await clientIp(),
    attribution: parseAttributionCookie((await cookies()).get(ATTRIBUTION_COOKIE)?.value),
  };
}

function submitDeps(): SubmitDeps {
  const send = adminLeadNotifier();
  return {
    // Telegram javob kutmasin: xabar javob qaytgandan keyin fonda yuboriladi
    notify: send
      ? async (html) => {
          after(() => send(html).catch((e) => console.warn("[leads] Telegram:", e)));
        }
      : undefined,
  };
}

/** Keyingi sahifada brauzer Meta Pixel / GA4'ga yuboradigan hodisa (lib/analytics.ts). */
async function track(event: TrackEvent) {
  (await cookies()).set(TRACK_COOKIE, event, {
    path: "/",
    maxAge: 120,
    sameSite: "lax",
    httpOnly: false,
  });
}

function zodFieldErrors(error: ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

const unknownError = () => m.lead.errors.unknown.replace("{phone}", m.footer.phone);
const rateLimitedError = () => m.lead.errors.rateLimited.replace("{phone}", m.footer.phone);

export async function submitLeadAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const { values } = formValues(formData);

  let status: Awaited<ReturnType<typeof submitLead>>["status"];
  try {
    status = (await submitLead(values, await submitContext(), submitDeps())).status;
  } catch (error) {
    if (error instanceof ZodError) return { fieldErrors: zodFieldErrors(error), values };
    console.error("[leads]", error);
    return { error: unknownError(), values };
  }

  if (status === "rate_limited") return { error: rateLimitedError(), values };
  if (status !== "spam") await track("Lead");
  // created / duplicate / spam — foydalanuvchiga bir xil "Rahmat" sahifasi
  redirect("/rahmat");
}

/** /register: sinov do'koni ochiladi va egasi darhol kabinetga kiradi. */
export async function registerAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const { values, safe } = formValues(formData);

  let result: Awaited<ReturnType<typeof selfSignup>>;
  try {
    result = await selfSignup(values, await submitContext(), submitDeps());
  } catch (error) {
    if (error instanceof ZodError) return { fieldErrors: zodFieldErrors(error), values: safe };
    if (error instanceof ServiceError) {
      return error.field
        ? { fieldErrors: { [error.field]: error.message }, values: safe }
        : { error: error.message, values: safe };
    }
    console.error("[signup]", error);
    return { error: unknownError(), values: safe };
  }

  if (result.status === "rate_limited") return { error: rateLimitedError(), values: safe };
  if (result.status === "spam") redirect("/rahmat");

  await track("CompleteRegistration");
  // Muvaffaqiyatli kirish — Auth.js o'zi /dashboard'ga yo'naltiradi (redirect xatosi tashlanadi)
  await signIn("credentials", {
    phone: result.phone,
    password: values.password,
    redirectTo: "/dashboard",
  });
  return {};
}
