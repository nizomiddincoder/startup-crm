import type { NextAuthConfig } from "next-auth";
import { canAccessPath, homePathForRole, isProtectedPath } from "@/lib/services/permissions";

/**
 * Edge muhitiga mos Auth.js sozlamasi (middleware shu faylni ishlatadi).
 * Bazaga murojaat qiluvchi qismlar (Credentials provider) auth.ts'da.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  // Railway kabi proksi orqasida domen so'rov sarlavhalaridan olinadi (AUTH_URL shart emas)
  trustHost: true,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12 soat — bitta ish smenasi
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      // Faqat sahifani ochishda (GET). Login formasi (POST, server action) har doim o'tkaziladi —
      // aks holda eski (bekor qilingan) cookie bilan qaytadan kirib bo'lmay qolardi.
      if (pathname === "/login" && user && request.method === "GET") {
        return Response.redirect(new URL(homePathForRole(user.role), request.nextUrl));
      }
      if (!isProtectedPath(pathname)) return true;
      if (!user) return false; // /login'ga yo'naltiriladi
      if (!canAccessPath(user.role, pathname)) {
        return Response.redirect(new URL(homePathForRole(user.role), request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.phone = user.phone;
        token.loginAt = Date.now();
        token.sid = crypto.randomUUID();
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      session.user.tenantName = token.tenantName;
      session.user.phone = token.phone;
      // Eski sessiyalarda bu maydon yo'q — 0 (faqat hali chiqish qilinmagan foydalanuvchida o'tadi)
      session.user.loginAt = token.loginAt ?? 0;
      session.user.sid = token.sid ?? "";
      return session;
    },
  },
} satisfies NextAuthConfig;
