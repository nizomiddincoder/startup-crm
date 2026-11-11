import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { authenticateUser, ipFromHeaders } from "@/lib/services/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // mode: "pin" (kassir) yoki "admin" (login/telefon + parol).
      // challengeId — Telegramda tasdiqlangan kirish so'rovi (lib/services/telegram/login-confirm.ts)
      credentials: { mode: {}, pin: {}, identifier: {}, password: {}, challengeId: {} },
      authorize: (credentials, request) =>
        authenticateUser(credentials, ipFromHeaders(request?.headers)),
    }),
  ],
});
