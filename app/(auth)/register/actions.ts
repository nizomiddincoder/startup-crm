"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { ZodError } from "zod";
import { signIn } from "@/auth";
import { uz } from "@/lib/i18n/uz";
import { selfSignup } from "@/lib/services/leads/signup";
import { ServiceError } from "@/lib/services/errors";
import { homePathForRole } from "@/lib/services/permissions";
import { sendToAdmin } from "@/lib/services/telegram/outbox";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "city" | "password" | "consent" | "shopName", string>>;
};

type FieldName = "name" | "phone" | "city" | "password" | "consent" | "shopName";

function clientIp(h: Headers) {
  // Proksi (Railway) qo'shgan oxirgi qiymat — mijoz soxtalashtira olmaydi
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",").pop()!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

function fieldErrorsOf(error: ZodError): RegisterState["fieldErrors"] {
  const out: Partial<Record<FieldName, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key as FieldName]) out[key as FieldName] = issue.message;
  }
  return out;
}

/**
 * Do'kon egasi o'zi ro'yxatdan o'tadi: do'kon + egasi + namunaviy katalog yaratiladi,
 * so'ng shu telefon va parol bilan kabinetga kiradi.
 */
export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const input = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    shopName: formData.get("shopName") ?? undefined,
    password: formData.get("password"),
    consent: formData.get("consent") ?? undefined,
  };
  const ip = clientIp(await headers());

  let result: Awaited<ReturnType<typeof selfSignup>>;
  try {
    result = await selfSignup(
      input,
      {
        ip,
        attribution: { utmSource: undefined, utmCampaign: undefined, keyword: undefined, ref: undefined },
      },
      {
        notify: async (html) => {
          await sendToAdmin(html);
        },
      },
    );
  } catch (error) {
    if (error instanceof ZodError) return { fieldErrors: fieldErrorsOf(error) };
    if (error instanceof ServiceError) {
      const field = error.field as FieldName | undefined;
      return field ? { fieldErrors: { [field]: error.message } } : { error: error.message };
    }
    console.error("[register]", error);
    return { error: uz.register.errors.unknown };
  }

  if (result.status === "rate_limited") return { error: uz.register.errors.rateLimited };
  if (result.status === "spam") return { error: uz.register.errors.unknown };

  try {
    await signIn("credentials", {
      phone: result.phone,
      password: String(input.password),
      redirectTo: homePathForRole("OWNER"),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: uz.auth.unknownError };
    throw error; // Next.js redirect'i shu yerdan o'tadi
  }
  return {};
}
