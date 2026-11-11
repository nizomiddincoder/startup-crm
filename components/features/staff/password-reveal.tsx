"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { uz } from "@/lib/i18n/uz";

/**
 * Yangi kirish ma'lumotini bir marta ko'rsatadi (nusxa olish tugmasi bilan).
 * Kassir uchun — PIN; boshqa xodim uchun — telefon (login) va parol.
 */
export function PasswordReveal({
  title,
  login,
  password,
  pin,
}: {
  title: string;
  login?: string;
  password?: string;
  pin?: string;
}) {
  const [copied, setCopied] = useState(false);
  const secret = pin ?? password ?? "";
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-accent p-4 text-accent-foreground"
      data-testid="password-reveal"
    >
      <p className="font-semibold">{title}</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {login && (
          <>
            <span>{uz.admin.login}:</span>
            <span className="font-mono font-semibold">{login}</span>
          </>
        )}
        <span>{pin ? uz.staff.pinLabel : uz.admin.password}:</span>
        <span className="flex items-center gap-2">
          <span
            className="font-mono text-base font-bold tracking-wider"
            data-testid={pin ? "new-pin" : "new-password"}
          >
            {secret}
          </span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(secret);
              setCopied(true);
            }}
            aria-label={uz.common.copy}
            className="rounded-md p-1 hover:bg-card"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </span>
      </div>
      <p className="text-xs">{pin ? uz.staff.pinHint : uz.staff.passwordHint}</p>
    </div>
  );
}
