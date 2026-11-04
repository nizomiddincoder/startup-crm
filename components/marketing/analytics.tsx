"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { GA_EVENT, parseTrackEvent, TRACK_COOKIE, type TrackEvent } from "@/lib/analytics";
import { isProtectedPath } from "@/lib/services/permissions";

type Props = { pixelId?: string; gaId?: string };

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Serverdan kelgan hodisani o'qiydi va cookie'ni o'chiradi (bir marta yuborilsin). */
function takeTrackEvent(): TrackEvent | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${TRACK_COOKIE}=([^;]*)`));
  if (!match) return null;
  document.cookie = `${TRACK_COOKIE}=; Max-Age=0; path=/`;
  return parseTrackEvent(decodeURIComponent(match[1]));
}

// Meta va Google'ning rasmiy kodidagi navbat (skript yuklanguncha chaqiruvlar yo'qolmaydi)
function initPixel(id: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  fbq("init", id);
}

function initGa(id: string) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js aynan `arguments` obyektini kutadi (massiv emas)
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false });
}

/**
 * Meta Pixel va Google Analytics 4. ID berilmasa — umuman render qilinmaydi (app/layout.tsx).
 * Sotuv sayti: har sahifada PageView. Dastur sahifalari (kabinet, kassa): faqat ro'yxatdan
 * o'tish hodisasi bo'lsa yuklanadi — do'kon ishini kuzatmaymiz.
 */
export function Analytics({ pixelId, gaId }: Props) {
  const pathname = usePathname();
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const event = takeTrackEvent();
    const appPage = isProtectedPath(pathname) || pathname.startsWith("/login");
    if (appPage && !event) return;

    if (pixelId) {
      initPixel(pixelId);
      if (!appPage) window.fbq!("track", "PageView");
      if (event) window.fbq!("track", event);
    }
    if (gaId) {
      initGa(gaId);
      if (!appPage) window.gtag!("event", "page_view", { page_path: pathname });
      if (event) window.gtag!("event", GA_EVENT[event]);
    }
    setLoad(true);
  }, [pathname, pixelId, gaId]);

  if (!load) return null;
  return (
    <>
      {pixelId && (
        <Script
          id="meta-pixel"
          src="https://connect.facebook.net/en_US/fbevents.js"
          strategy="afterInteractive"
        />
      )}
      {gaId && (
        <Script
          id="ga4"
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
