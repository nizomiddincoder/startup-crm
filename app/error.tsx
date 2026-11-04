"use client";

import { useEffect } from "react";
import { HelpDialog } from "@/components/features/support/help-dialog";
import { ErrorScreen } from "@/components/marketing/error-screen";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

// Sahifada kutilmagan xato (500). Texnik tafsilot foydalanuvchiga ko'rsatilmaydi — faqat logda.
export default function ServerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen code="500" title={uz.errorPages.serverTitle} text={uz.errorPages.serverText}>
      <Button size="lg" variant="outline" className="h-12" onClick={reset}>
        {uz.errorPages.retry}
      </Button>
      {/* Xato kodi (digest) xabarga qo'shiladi — server logida aynan shu xatoni topish oson */}
      <HelpDialog
        variant="button"
        contacts={{ phone: null, telegramUrl: null }}
        errorCode={error.digest}
      />
    </ErrorScreen>
  );
}
