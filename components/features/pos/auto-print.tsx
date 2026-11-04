"use client";

import { useEffect } from "react";

/**
 * Sahifa yuklangach chop etish oynasini chaqiradi. Kassa kompyuterida Chrome
 * `--kiosk-printing` bilan ochilgan bo'lsa — oynasiz, to'g'ridan-to'g'ri chek printeriga.
 */
export function AutoPrint() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void document.fonts.ready.then(() => window.print());
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
