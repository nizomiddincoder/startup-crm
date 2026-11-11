"use client";

import { Check, ChevronDown, ChevronUp, Delete, Send, ShoppingCart } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  completeLoginAction,
  loginAction,
  loginChallengeStateAction,
  pinLoginAction,
  type Credentials,
  type LoginState,
} from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";
import type { Role } from "@/lib/services/permissions";

const PIN_LENGTH = 4;

type DemoUser = { name: string; phone: string; role: Role; login?: string };

type Props = {
  /** Faqat lokal sinov rejimida (DEMO_MODE): bir bosishda kirish */
  demo?: { password: string; pin: string; users: DemoUser[] };
};

function toFormData(creds: Credentials, challengeId?: string) {
  const data = new FormData();
  data.set("mode", creds.mode);
  if (creds.mode === "pin") {
    data.set("pin", creds.pin);
  } else {
    data.set("identifier", creds.identifier);
    data.set("password", creds.password);
  }
  if (challengeId) data.set("challengeId", challengeId);
  return data;
}

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
    startTransition(() => complete(toFormData(credentials, challengeId)));
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

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function LoginForm({ demo }: Props) {
  const [pin, setPin] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [pinState, pinAction, pinPending] = useActionState<LoginState, FormData>(pinLoginAction, {});
  const [adminState, adminAction, adminPending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );
  const pinFormRef = useRef<HTMLFormElement>(null);
  const adminFormRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // React formani yuborgach tozalaydi — Telegram tasdig'idan keyin kirish uchun saqlab qo'yamiz
  const saved = useRef<Credentials>({ mode: "pin", pin: "" });
  const [cancelled, setCancelled] = useState<string | null>(null);

  const challengeId = pinState.challengeId ?? adminState.challengeId;

  // Xato bo'lsa PIN tozalanadi — qaytadan terish uchun
  useEffect(() => {
    if (pinState.error || pinState.fieldErrors) setPin("");
  }, [pinState]);

  // Klaviatura (kompyuter): raqamlar, Backspace, Enter
  useEffect(() => {
    if (showAdmin || challengeId) return;
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < PIN_LENGTH ? p + e.key : p));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter" && pin.length === PIN_LENGTH) pinFormRef.current?.requestSubmit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAdmin, challengeId, pin]);

  function fillDemo(user: DemoUser) {
    if (!demo) return;
    if (user.role === "CASHIER") {
      saved.current = { mode: "pin", pin: demo.pin };
      setPin(demo.pin);
      setTimeout(() => pinFormRef.current?.requestSubmit(), 0);
      return;
    }
    if (identifierRef.current) identifierRef.current.value = user.login ?? user.phone;
    if (passwordRef.current) passwordRef.current.value = demo.password;
    adminFormRef.current?.requestSubmit();
  }

  if (challengeId && challengeId !== cancelled) {
    return (
      <ConfirmWait
        challengeId={challengeId}
        credentials={saved.current}
        onCancel={() => setCancelled(challengeId)}
      />
    );
  }

  const pinError = pinState.error ?? pinState.fieldErrors?.pin;
  const adminError = adminState.error;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShoppingCart className="size-7" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{uz.app.name}</h1>
        <p className="text-sm text-muted-foreground">{uz.auth.pinSubtitle}</p>
      </div>

      {/* PIN: 4 ta nuqta */}
      <div className="flex justify-center gap-4" aria-label={uz.auth.pinLabel} data-testid="pin-dots">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`size-4 rounded-full border-2 transition-colors ${
              i < pin.length ? "border-primary bg-primary" : "border-muted-foreground/40"
            }`}
          />
        ))}
      </div>

      {pinError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {pinError}
        </p>
      )}

      <form
        ref={pinFormRef}
        action={pinAction}
        onSubmit={() => {
          saved.current = { mode: "pin", pin };
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="pin" value={pin} />
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k) => (
            <PadKey key={k} onClick={() => setPin((p) => (p.length < PIN_LENGTH ? p + k : p))}>
              {k}
            </PadKey>
          ))}
          <PadKey label={uz.auth.pinBackspace} onClick={() => setPin((p) => p.slice(0, -1))}>
            <Delete className="size-6" />
          </PadKey>
          <PadKey onClick={() => setPin((p) => (p.length < PIN_LENGTH ? p + "0" : p))}>0</PadKey>
          <button
            type="submit"
            aria-label={uz.auth.pinSubmit}
            disabled={pin.length !== PIN_LENGTH || pinPending}
            className="flex h-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Check className="size-7" />
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setShowAdmin((v) => !v)}
        className="mx-auto inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        aria-expanded={showAdmin}
      >
        {uz.auth.adminLogin}
        {showAdmin ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {showAdmin && (
        <form
          ref={adminFormRef}
          action={adminAction}
          onSubmit={(e) => {
            const data = new FormData(e.currentTarget);
            saved.current = {
              mode: "admin",
              identifier: String(data.get("identifier") ?? ""),
              password: String(data.get("password") ?? ""),
            };
          }}
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">{uz.auth.identifier}</Label>
            <Input
              ref={identifierRef}
              id="identifier"
              name="identifier"
              autoComplete="username"
              placeholder={uz.auth.identifierPlaceholder}
              aria-invalid={!!adminState.fieldErrors?.identifier}
              required
            />
            {adminState.fieldErrors?.identifier && (
              <p className="text-sm text-destructive">{adminState.fieldErrors.identifier}</p>
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
              aria-invalid={!!adminState.fieldErrors?.password}
              required
            />
            {adminState.fieldErrors?.password && (
              <p className="text-sm text-destructive">{adminState.fieldErrors.password}</p>
            )}
          </div>
          {adminError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {adminError}
            </p>
          )}
          <Button type="submit" size="lg" disabled={adminPending}>
            {adminPending ? uz.auth.loggingIn : uz.auth.login}
          </Button>
        </form>
      )}

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
                disabled={pinPending || adminPending}
                onClick={() => fillDemo(u)}
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

function PadKey({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-16 items-center justify-center rounded-2xl bg-muted text-2xl font-semibold text-foreground transition-colors hover:bg-accent active:scale-95"
    >
      {children}
    </button>
  );
}

