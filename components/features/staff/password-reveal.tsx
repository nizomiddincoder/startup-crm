"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { uz } from "@/lib/i18n/uz";

/** Yangi parolni bir marta ko'rsatadi (nusxa olish tugmasi bilan). */
export function PasswordReveal({
  title,
  login,
  password,
}: {
  title: string;
  login: string;
  password: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-accent p-4 text-accent-foreground"
      data-testid="password-reveal"
    >
      <p className="font-semibold">{title}</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <span>{uz.admin.login}:</span>
        <span className="font-mono font-semibold">{login}</span>
        <span>{uz.admin.password}:</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-base font-bold tracking-wider" data-testid="new-password">
            {password}
          </span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(password);
              setCopied(true);
            }}
            aria-label={uz.common.copy}
            className="rounded-md p-1 hover:bg-card"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </span>
      </div>
      <p className="text-xs">{uz.staff.passwordHint}</p>
    </div>
  );
}
