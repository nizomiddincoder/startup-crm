"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { marketing as m } from "@/lib/i18n/marketing.uz";

const STORAGE_KEY = "cookie-notice-ok";

/**
 * Cookie haqida qisqa xabar (sotuv sayti). "Tushunarli" bosilgach — shu brauzerda boshqa chiqmaydi.
 * Pastki chap burchakda: o'ngdagi Telegram tugmasini to'smaydi. Sahifa siljimaydi (fixed).
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Brauzer xotirasi yopiq (maxfiy rejim) — xabarni ko'rsatmaymiz
    }
  }, []);

  if (!visible) return null;

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label={m.cookie.ok}
      data-testid="cookie-notice"
      className="fixed right-22 bottom-4 left-4 z-50 flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 text-xs shadow-lg sm:right-auto sm:max-w-md sm:text-sm"
    >
      <p className="text-muted-foreground">
        {m.cookie.text}{" "}
        <Link href="/maxfiylik" className="font-semibold text-primary underline">
          {m.cookie.link}
        </Link>
        .
      </p>
      <Button size="sm" className="shrink-0" onClick={accept}>
        {m.cookie.ok}
      </Button>
    </div>
  );
}
