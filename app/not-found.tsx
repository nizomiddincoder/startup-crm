import type { Metadata } from "next";
import { ErrorScreen } from "@/components/marketing/error-screen";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = {
  title: uz.errorPages.notFoundTitle,
  robots: { index: false },
};

// 404 sahifasi (dastur uchun)
export default function NotFound() {
  return (
    <ErrorScreen code="404" title={uz.errorPages.notFoundTitle} text={uz.errorPages.notFoundText} />
  );
}
