"use client";

import { Send } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import {
  completeLoginAction,
  loginAction,
  loginChallengeStateAction,
  type LoginState,
} from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";
import type { Role } from "@/lib/services/permissions";

type Props = {
  /** Faqat lokal sinov rejimida (DEMO_MODE): bir bosishda kirish ma'lumotlarini yozish */
  demo?: { password: string; users: { name: string; phone: string; role: Role }[] };
};

type Credentials = { phone: string; password: string };

/**
 * Telegramda tasdiqlashni kutish: har 2 soniyada holat so'raladi; tasdiqlansa — sessiya ochiladi.
 */
function ConfirmWait({
  challengeId,
  credentials,
  onCancel,
}: {
  challengeId: string;
  credentials: Credentials;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<string>("PENDING");
  const [state, complete, pending] = useActionState<LoginState, FormData>(completeLoginAction, {});

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const next = await loginChallengeStateAction(challengeId);
      setStatus(next);
      if (next !== "PENDING") window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [challengeId]);

  useEffect(() => {
    if (status !== "APPROVED") return;
    const data = new FormData();
    data.set("phone", credentials.phone);
    data.set("password", credentials.password);
    data.set("challengeId", challengeId);
    startTransition(() => complete(data));
  }, [status, challengeId, credentials, complete]);

  const error =
    state.error ??
    (status === "DENIED"
      ? uz.auth.confirmDenied
      : status === "EXPIRED" || status === "CONSUMED"
        ? uz.auth.confirmExpired
        : undefined);

  return (
    <div className="flex flex-col items-center gap-4 text-center" data-testid="login-confirm">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Send className="size-7" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{uz.auth.confirmTitle}</h2>
        <p className="text-sm text-muted-foreground">{uz.auth.confirmText}</p>
      </div>
      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          {pending || status === "APPROVED" ? uz.auth.loggingIn : uz.auth.confirmWaiting}
        </p>
      )}
      <Button variant="outline" onClick={onCancel} disabled={pending}>
        {uz.auth.confirmCancel}
      </Button>
    </div>
  );
}

export function LoginForm({ demo }: Props) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // React formani yuborgach tozalaydi — Telegram tasdig'idan keyin kirish uchun saqlab qo'yamiz
  const saved = useRef<Credentials>({ phone: "", password: "" });
  const [cancelled, setCancelled] = useState<string | null>(null);

  function fillDemo(phone: string) {
    if (phoneRef.current) phoneRef.current.value = phone.replace(/^\+998/, "");
    if (passwordRef.current && demo) passwordRef.current.value = demo.password;
    passwordRef.current?.form?.requestSubmit();
  }

  if (state.challengeId && state.challengeId !== cancelled) {
    return (
      <ConfirmWait
        challengeId={state.challengeId}
        credentials={saved.current}
        onCancel={() => setCancelled(state.challengeId!)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        action={formAction}
        onSubmit={(e) => {
          const data = new FormData(e.currentTarget);
          saved.current = {
            phone: String(data.get("phone") ?? ""),
            password: String(data.get("password") ?? ""),
          };
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">{uz.auth.phone}</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">+998</span>
            <Input
              ref={phoneRef}
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              placeholder={uz.auth.phonePlaceholder}
              aria-invalid={!!state.fieldErrors?.phone}
              required
            />
          </div>
          {state.fieldErrors?.phone && (
            <p className="text-sm text-destructive">{state.fieldErrors.phone}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{uz.auth.password}</Label>
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!state.fieldErrors?.password}
            required
          />
          {state.fieldErrors?.password && (
            <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
          )}
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? uz.auth.loggingIn : uz.auth.login}
        </Button>
      </form>

      {demo && (
        <section
          className="flex flex-col gap-2 rounded-xl border border-dashed p-3"
          data-testid="demo-logins"
        >
          <p className="text-xs font-semibold text-muted-foreground">{uz.auth.demoTitle}</p>
          <div className="flex flex-wrap gap-2">
            {demo.users.map((u) => (
              <button
                key={u.phone}
                type="button"
                disabled={pending}
                onClick={() => fillDemo(u.phone)}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {uz.roles[u.role]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{uz.auth.demoHint}</p>
        </section>
      )}
    </div>
  );
}
