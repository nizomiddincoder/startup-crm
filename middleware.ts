import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authConfig } from "./auth.config";

// Har so'rovda sessiya va rol tekshiriladi (qoidalar: lib/services/permissions.ts).
// Sayt (reklama/UTM) qismi olib tashlangan — faqat kirish tekshiruvi qoldi.
const authMiddleware = NextAuth(authConfig).auth as unknown as (
  req: NextRequest,
  ev: NextFetchEvent,
) => Promise<Response | undefined>;

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // /logout'da Auth.js sessiya cookie'sini "yangilamasin" (bekor qilingan sessiya qayta yozilmasin)
  if (req.nextUrl.pathname === "/logout") return undefined;
  return authMiddleware(req, ev);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
