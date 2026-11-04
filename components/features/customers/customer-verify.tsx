"use client";

import { BadgeCheck, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  confirmCustomerCodeAction,
  customerVerificationStateAction,
  startCustomerVerificationAction,
} from "@/app/pos/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";
import { formatDateTime } from "@/lib/services/format";

type Props = { customerId: string; verifiedAt: string | null };

/**
 * Kassada mijoz raqamini tasdiqlash: QR → mijoz botda raqamini yuboradi → bot 4 xonali kod
 * beradi → mijoz kassirga aytadi → kassir shu yerga kiritadi.
 */
export function CustomerVerify({ customerId, verifiedAt }: Props) {
  const router = useRouter();
  const [qr, setQr] = useState<{ url: string; svg: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  // QR ko'rsatilgach — mijoz botda kod olganini kuzatamiz
  useEffect(() => {
    if (!qr) return;
    const timer = window.setInterval(async () => {
      const next = await customerVerificationStateAction(customerId);
      setStatus(next);
      if (next === "CODE_SENT" || next === "DONE" || next === "EXPIRED")
        window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [qr, customerId]);

  function begin() {
    setError(undefined);
    setStatus(null);
    start(async () => {
      const res = await startCustomerVerificationAction(customerId);
      if (res.error || !res.url || !res.qr) return setError(res.error);
      setQr({ url: res.url, svg: res.qr });
    });
  }

  function confirm() {
    setError(undefined);
    start(async () => {
      const res = await confirmCustomerCodeAction(customerId, code);
      if (!res.ok) return setError(res.error ?? res.fieldErrors?.code);
      setQr(null);
      router.refresh();
    });
  }

  if (verifiedAt && !qr) {
    return (
      <p className="flex items-center gap-2 text-sm text-primary" data-testid="customer-verified">
        <BadgeCheck className="size-4" />
        {uz.telegram.verifyDone} · {formatDateTime(new Date(verifiedAt))}
      </p>
    );
  }

  return (
    <section
      className="flex max-w-2xl flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card"
      data-testid="customer-verify"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Send className="size-4 text-primary" />
          {uz.telegram.verifyCustomer}
        </h2>
        <Button variant={qr ? "ghost" : "default"} size="sm" disabled={pending} onClick={begin}>
          {qr ? "↻" : uz.telegram.verifyShowQr}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{uz.telegram.verifyCustomerHint}</p>

      {qr && (
        <div className="flex flex-wrap items-start gap-5">
          <div
            className="rounded-xl border bg-white p-2"
            aria-label={uz.telegram.verifyCustomer}
            role="img"
            // QR-kod serverda yaratilgan SVG (faqat havola matni)
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <a
              href={qr.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs break-all text-primary underline"
              data-testid="verify-link"
            >
              {qr.url}
            </a>
            <p className="text-sm" role="status">
              {status === "CODE_SENT"
                ? uz.telegram.verifyCodeSent
                : status === "EXPIRED"
                  ? uz.telegram.verifyExpired
                  : uz.telegram.verifyWaiting}
            </p>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) confirm();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="verify-code">{uz.telegram.verifyCodeLabel}</Label>
                <Input
                  id="verify-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="0000"
                  className="h-11 w-28 text-center text-lg tracking-[0.4em] tabular-nums"
                />
              </div>
              <Button type="submit" disabled={pending || code.length !== 4}>
                {uz.telegram.verifyConfirm}
              </Button>
            </form>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
