"use client";

import { LifeBuoy, Phone, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { sendSupportRequestAction } from "@/app/support/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";
import { cn } from "@/lib/utils";
import { AssistantChat } from "./assistant-chat";

export type SupportContacts = {
  phone: string | null;
  telegramUrl: string | null;
  /** AI yordamchi ulangan (GEMINI_API_KEY) — oynada birinchi yorliq */
  aiEnabled?: boolean;
};

type Props = {
  contacts: SupportContacts;
  /** Tugma ko'rinishi: chap menyuda (ikonka + yozuv) yoki oddiy */
  variant?: "sidebar" | "button";
  /** Xato sahifasidan: xato kodi xabarga qo'shiladi */
  errorCode?: string;
};

/** "Yordam": aloqa (telefon, Telegram) va "Muammo haqida xabar berish" — barcha rollarda. */
export function HelpDialog({ contacts, variant = "sidebar", errorCode }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ ok?: boolean; error?: string }>({});
  const [pending, start] = useTransition();
  // Xato sahifasidan ochilsa — darhol "xabar berish"; aks holda AI (ulangan bo'lsa)
  const [tab, setTab] = useState<"ai" | "contact">(
    contacts.aiEnabled && !errorCode ? "ai" : "contact",
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function send() {
    setResult({});
    start(async () => {
      const res = await sendSupportRequestAction({ message, page: pathname, errorCode });
      if (res.ok) {
        setMessage("");
        setResult({ ok: true });
      } else setResult({ error: res.error ?? res.fieldErrors?.message });
    });
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-sidebar-foreground hover:bg-accent hover:text-accent-foreground md:w-full"
          data-testid="help-button"
        >
          <LifeBuoy className="size-5" />
          {uz.support.button}
        </button>
      ) : (
        <Button variant="outline" size="lg" className="h-12" onClick={() => setOpen(true)}>
          <LifeBuoy className="size-4" />
          {uz.support.reportError}
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="flex max-h-[100dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-t-3xl bg-card p-6 text-left shadow-xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="help-title" className="flex items-center gap-2 text-lg font-bold">
                <LifeBuoy className="size-5 text-primary" />
                {uz.support.title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={uz.support.close}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            {contacts.aiEnabled && (
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
                {(
                  [
                    ["ai", uz.assistant.tab],
                    ["contact", uz.assistant.contactTab],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                      tab === key ? "bg-card shadow-card" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {tab === "ai" && contacts.aiEnabled ? (
              <AssistantChat />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{uz.support.intro}</p>

                {(contacts.phone || contacts.telegramUrl) && (
                  <div className="flex flex-wrap gap-2">
                    {contacts.phone && (
                      <a
                        href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        <Phone className="size-4" />
                        {contacts.phone}
                      </a>
                    )}
                    {contacts.telegramUrl && (
                      <a
                        href={contacts.telegramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants()}
                      >
                        <Send className="size-4" />
                        {uz.support.write}
                      </a>
                    )}
                  </div>
                )}

                <form
                  className="flex flex-col gap-3 border-t pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <Label htmlFor="support-message" className="font-semibold">
                    {uz.support.reportTitle}
                  </Label>
                  <textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={uz.support.reportPlaceholder}
                    className={cn(
                      "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    )}
                  />
                  <p className="text-xs text-muted-foreground">{uz.support.reportHint}</p>
                  {result.error && (
                    <p role="alert" className="text-sm text-destructive">
                      {result.error}
                    </p>
                  )}
                  {result.ok && (
                    <p role="status" className="text-sm font-semibold text-primary">
                      {uz.support.sent}
                    </p>
                  )}
                  <Button type="submit" disabled={pending || message.trim().length < 5}>
                    {pending ? uz.pos.saving : uz.support.send}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
