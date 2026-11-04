import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_DAYS,
  attributionFromSearch,
  serializeAttribution,
} from "@/lib/services/leads/attribution";
import { authConfig } from "./auth.config";

// Har so'rovda sessiya va rol tekshiriladi (qoidalar: lib/services/permissions.ts).
const authMiddleware = NextAuth(authConfig).auth as unknown as (
  req: NextRequest,
  ev: NextFetchEvent,
) => Promise<Response | undefined>;

/**
 * Reklama belgilari (?utm_source=..., ?ref=...) serverda, sahifa so'ralgan zahoti 30 kunlik
 * cookie'ga yoziladi — JavaScript yuklanishini kutmaydi (tashrifchi tez boshqa sahifaga o'tsa ham
 * belgi yo'qolmaydi). Oxirgi reklama hisobga olinadi; belgisiz kirish cookie'ni o'zgartirmaydi.
 */
export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // /logout'da Auth.js sessiya cookie'sini "yangilamasin": aks holda u o'chirish bilan bir
  // javobda qayta yozilib, bekor qilingan sessiya /logout ↔ /dashboard aylanishiga tushardi
  if (req.nextUrl.pathname === "/logout") return NextResponse.next();

  const res = await authMiddleware(req, ev);
  const found = attributionFromSearch(req.nextUrl.searchParams);
  if (!found) return res;

  // Yo'naltirish javobi (masalan /login'ga) — sarlavhalari o'zgarmas, belgini yozmaymiz.
  // (Auth.js o'z javob obyektini qaytaradi — `instanceof NextResponse` bunda ishlamaydi.)
  if (res && res.status >= 300 && res.status < 400) return res;
  const out = res ?? NextResponse.next();
  const secure = req.nextUrl.protocol === "https:" ? "; Secure" : "";
  out.headers.append(
    "Set-Cookie",
    `${ATTRIBUTION_COOKIE}=${serializeAttribution(found)}; Path=/; Max-Age=${
      ATTRIBUTION_MAX_AGE_DAYS * 24 * 60 * 60
    }; SameSite=Lax${secure}`,
  );
  return out;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
