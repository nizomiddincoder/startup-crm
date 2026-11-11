"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { t, uz } from "@/lib/i18n/uz";
import {
  ipFromHeaders,
  loginBlockedMinutes,
  pinBlockedMinutes,
  verifyAdmin,
  verifyPin,
  type VerifiedUser,
} from "@/lib/services/auth";
import type { Role } from "@/lib/services/permissions";
import { homePathForRole } from "@/lib/services/permissions";
import {
  createLoginChallenge,
  getChallengeState,
  loginConfirmRequired,
  type ChallengeState,
} from "@/lib/services/telegram/login-confirm";
import { sendLoginRequest } from "@/lib/services/telegram/outbox";
import { adminLoginSchema, pinLoginSchema } from "@/lib/validation/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: { identifier?: string; password?: string; pin?: string };
  /** Telegramda tasdiqlash kutilmoqda — forma shu ID bo'yicha holatni so'raydi */
  challengeId?: string;
};

/** Kirish ma'lumotlari: kassir PIN'i yoki admin login/parol. Forma Telegram tasdig'idan keyin qayta yuboradi. */
export type Credentials =
  | { mode: "pin"; pin: string }
  | { mode: "admin"; identifier: string; password: string };

async function finishSignIn(
  creds: Credentials,
  role: Role,
  challengeId?: string,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      ...creds,
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

/** Telegram ulangan bo'lsa — kirish botda tasdiqlanadi. Null — tasdiqlash shart emas. */
async function challengeFor(user: VerifiedUser): Promise<LoginState | null> {
  if (!loginConfirmRequired(user)) return null;
  const challengeId = await createLoginChallenge(user.id);
  try {
    await sendLoginRequest({ ...user, telegramChatId: user.telegramChatId! }, challengeId);
  } catch (error) {
    console.warn("[login] Telegram:", error instanceof Error ? error.message : error);
    return { error: uz.auth.confirmSendFailed };
  }
  return { challengeId };
}

/** Kassir: 4 xonali PIN. IP bo'yicha cheklangan. */
export async function pinLoginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = pinLoginSchema.safeParse({ pin: formData.get("pin") });
  if (!parsed.success) {
    return { fieldErrors: { pin: parsed.error.issues[0]?.message } };
  }
  const ip = ipFromHeaders(await headers());
  const blocked = pinBlockedMinutes(ip);
  if (blocked) return { error: t(uz.auth.tooManyAttempts, { minutes: blocked }) };

  const user = await verifyPin(parsed.data, ip);
  if (!user) {
    const nowBlocked = pinBlockedMinutes(ip);
    return {
      error: nowBlocked
        ? t(uz.auth.tooManyAttempts, { minutes: nowBlocked })
        : uz.auth.invalidPin,
    };
  }
  const pending = await challengeFor(user);
  if (pending) return pending;
  return finishSignIn({ mode: "pin", pin: parsed.data.pin }, user.role);
}

/** Admin: login yoki telefon + parol. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = adminLoginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: { identifier: errors.identifier?.[0], password: errors.password?.[0] },
    };
  }
  const { identifier, password } = parsed.data;

  // Rolni oldindan bilish uchun tekshiramiz — kirgandan keyin to'g'ri sahifaga yo'naltiramiz.
  const blockedBefore = loginBlockedMinutes(identifier);
  if (blockedBefore) return { error: t(uz.auth.tooManyAttempts, { minutes: blockedBefore }) };

  const user = await verifyAdmin({ identifier, password });
  if (!user) {
    const blocked = loginBlockedMinutes(identifier);
    return {
      error: blocked
        ? t(uz.auth.tooManyAttempts, { minutes: blocked })
        : uz.auth.invalidCredentials,
    };
  }
  const pending = await challengeFor(user);
  if (pending) return pending;
  return finishSignIn({ mode: "admin", identifier, password }, user.role);
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
  const challengeId = String(formData.get("challengeId") ?? "");
  const ip = ipFromHeaders(await headers());
  let creds: Credentials;
  let role: Role;

  if (formData.get("mode") === "pin") {
    const parsed = pinLoginSchema.safeParse({ pin: formData.get("pin") });
    if (!parsed.success || !challengeId) return { error: uz.auth.invalidPin };
    const user = await verifyPin(parsed.data, ip);
    if (!user) return { error: uz.auth.invalidPin };
    creds = { mode: "pin", pin: parsed.data.pin };
    role = user.role;
  } else {
    const parsed = adminLoginSchema.safeParse({
      identifier: formData.get("identifier"),
      password: formData.get("password"),
    });
    if (!parsed.success || !challengeId) return { error: uz.auth.invalidCredentials };
    const user = await verifyAdmin(parsed.data);
    if (!user) return { error: uz.auth.invalidCredentials };
    creds = { mode: "admin", ...parsed.data };
    role = user.role;
  }

  const state = await getChallengeState(challengeId);
  if (state !== "APPROVED") {
    return { error: state === "DENIED" ? uz.auth.confirmDenied : uz.auth.confirmExpired };
  }
  return finishSignIn(creds, role, challengeId);
}
