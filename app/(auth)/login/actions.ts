"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { t, uz } from "@/lib/i18n/uz";
import { loginBlockedMinutes, verifyPassword } from "@/lib/services/auth";
import { homePathForRole } from "@/lib/services/permissions";
import {
  createLoginChallenge,
  getChallengeState,
  loginConfirmRequired,
  type ChallengeState,
} from "@/lib/services/telegram/login-confirm";
import { sendLoginRequest } from "@/lib/services/telegram/outbox";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: { phone?: string; password?: string };
  /** Telegramda tasdiqlash kutilmoqda — forma shu ID bo'yicha holatni so'raydi */
  challengeId?: string;
};

function parse(formData: FormData) {
  return loginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
}

async function finishSignIn(
  data: { phone: string; password: string },
  role: Parameters<typeof homePathForRole>[0],
  challengeId?: string,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      ...data,
      ...(challengeId ? { challengeId } : {}),
      redirectTo: homePathForRole(role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin" ? uz.auth.invalidCredentials : uz.auth.unknownError,
      };
    }
    throw error; // Next.js redirect'i shu yerdan o'tadi
  }
  return {};
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { phone: errors.phone?.[0], password: errors.password?.[0] } };
  }

  // Rolni oldindan bilish uchun tekshiramiz — shunda kirgandan keyin to'g'ri sahifaga
  // (kassa / panel / admin) bitta qadamda yo'naltiramiz.
  const blockedBefore = loginBlockedMinutes(parsed.data.phone);
  if (blockedBefore) return { error: t(uz.auth.tooManyAttempts, { minutes: blockedBefore }) };

  const user = await verifyPassword(parsed.data);
  if (!user) {
    const blocked = loginBlockedMinutes(parsed.data.phone);
    return {
      error: blocked
        ? t(uz.auth.tooManyAttempts, { minutes: blocked })
        : uz.auth.invalidCredentials,
    };
  }

  // Telegram ulangan — kirish botda tasdiqlanadi (sessiya faqat tasdiqdan keyin ochiladi)
  if (loginConfirmRequired(user)) {
    const challengeId = await createLoginChallenge(user.id);
    try {
      await sendLoginRequest({ ...user, telegramChatId: user.telegramChatId! }, challengeId);
    } catch (error) {
      console.warn("[login] Telegram:", error instanceof Error ? error.message : error);
      return { error: uz.auth.confirmSendFailed };
    }
    return { challengeId };
  }

  return finishSignIn(parsed.data, user.role);
}

/** Forma har 2 soniyada so'raydi: tasdiqlandimi. ID taxmin qilib bo'lmaydigan tasodifiy satr. */
export async function loginChallengeStateAction(id: string): Promise<ChallengeState> {
  return getChallengeState(String(id).slice(0, 64));
}

/** Telegramda tasdiqlangach — sessiya ochiladi (so'rov bir marta ishlatiladi). */
export async function completeLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = parse(formData);
  const challengeId = String(formData.get("challengeId") ?? "");
  if (!parsed.success || !challengeId) return { error: uz.auth.invalidCredentials };
  const user = await verifyPassword(parsed.data);
  if (!user) return { error: uz.auth.invalidCredentials };
  const state = await getChallengeState(challengeId);
  if (state !== "APPROVED") {
    return { error: state === "DENIED" ? uz.auth.confirmDenied : uz.auth.confirmExpired };
  }
  return finishSignIn(parsed.data, user.role, challengeId);
}
