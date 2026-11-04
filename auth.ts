import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { authenticateUser } from "@/lib/services/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // challengeId — Telegramda tasdiqlangan kirish so'rovi (lib/services/telegram/login-confirm.ts)
      credentials: { phone: {}, password: {}, challengeId: {} },
      authorize: (credentials) => authenticateUser(credentials),
    }),
  ],
});
