"use client";

import { ErrorScreen } from "@/components/marketing/error-screen";
import { uz } from "@/lib/i18n/uz";
import "./globals.css";

// Asosiy layout'ning o'zi yiqilsa (juda kam holat) — o'zining <html> qobig'i bilan 500 sahifa.
export default function GlobalError() {
  return (
    <html lang="uz">
      <body className="antialiased">
        <ErrorScreen code="500" title={uz.errorPages.serverTitle} text={uz.errorPages.serverText} />
      </body>
    </html>
  );
}
