"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { registerAction, submitLeadAction, type LeadFormState } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { formatPhoneMask } from "@/lib/phone-mask";
import {
  CONSENT_REQUIRED_SOURCES,
  LEAD_CITIES,
  type LeadSource,
} from "@/lib/validation/lead-constants";

type Props = {
  title: string;
  subtitle: string;
  /** "website" — sayt sahifalari, "self_signup" — /register, "pilot" — /pilot */
  source: LeadSource;
  /** Yashirin izoh: masalan "Jihoz: Ekonom to'plam" (adminga ko'rinadi) */
  message?: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

/**
 * Ariza formasi: server action + Zod, spam-tuzoq maydon, telefon maskasi.
 * source="self_signup" (/register) — parol maydoni bor, yuborilganda sinov do'koni ochiladi.
 */
export function LeadForm({ title, subtitle, source, message }: Props) {
  const isSignup = source === "self_signup";
  const needsConsent = isSignup || CONSENT_REQUIRED_SOURCES.includes(source);
  const [state, action, pending] = useActionState<LeadFormState, FormData>(
    isSignup ? registerAction : submitLeadAction,
    {},
  );
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [phone, setPhone] = useState(formatPhoneMask(v.phone ?? ""));

  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl border bg-card p-6 shadow-card md:p-8">
      <div className="mb-6 flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      {/*
        onSubmit (action= emas): React 19 `action=` bilan yuborilgan formani xatodan keyin ham
        avtomatik tozalaydi — telefon va shahar o'chib ketardi. Bu yerda forma tozalanmaydi.
      */}
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          const data = new FormData(ev.currentTarget);
          startTransition(() => action(data));
        }}
      >
        <input type="hidden" name="source" value={source} />
        {message && <input type="hidden" name="message" value={message} />}

        {/* Spam-tuzoq: odam ko'rmaydi va to'ldirmaydi, botlar to'ldiradi */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`website-${source}`}>{m.lead.honeypot}</label>
          <input
            id={`website-${source}`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`lead-name-${source}`}>{m.lead.name}</Label>
          <Input
            id={`lead-name-${source}`}
            name="name"
            autoComplete="name"
            defaultValue={v.name}
            aria-invalid={!!e.name}
            className="h-12 text-base"
          />
          <FieldError message={e.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`lead-phone-${source}`}>{m.lead.phone}</Label>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-muted-foreground">+998</span>
            <Input
              id={`lead-phone-${source}`}
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={m.lead.phonePlaceholder}
              value={phone}
              onChange={(ev) => setPhone(formatPhoneMask(ev.target.value))}
              aria-invalid={!!e.phone}
              className="h-12 text-base tracking-wide"
            />
          </div>
          <FieldError message={e.phone} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`lead-city-${source}`}>{m.lead.city}</Label>
          <NativeSelect
            id={`lead-city-${source}`}
            name="city"
            defaultValue={v.city ?? ""}
            aria-invalid={!!e.city}
            className="w-full [&_select]:h-12 [&_select]:text-base"
          >
            <NativeSelectOption value="" disabled>
              {m.lead.cityPlaceholder}
            </NativeSelectOption>
            {LEAD_CITIES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {m.lead.cities[c]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError message={e.city} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`lead-shop-${source}`}>{m.lead.shop}</Label>
          <Input
            id={`lead-shop-${source}`}
            name="shopName"
            placeholder={m.lead.shopPlaceholder}
            defaultValue={v.shopName}
            aria-invalid={!!e.shopName}
            className="h-12 text-base"
          />
          <FieldError message={e.shopName} />
        </div>

        {isSignup && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`lead-password-${source}`}>{m.signup.password}</Label>
            <Input
              id={`lead-password-${source}`}
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!e.password}
              aria-describedby={`lead-password-hint-${source}`}
              className="h-12 text-base"
            />
            <p id={`lead-password-hint-${source}`} className="text-sm text-muted-foreground">
              {m.signup.passwordHint}
            </p>
            <FieldError message={e.password} />
          </div>
        )}

        {needsConsent && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                defaultChecked={v.consent === "on"}
                aria-invalid={!!e.consent}
                className="mt-0.5 size-5 shrink-0 accent-primary"
                data-testid="consent"
              />
              <span>
                {(() => {
                  const [before, rest] = m.consent.label.split("{offer}");
                  const [middle, after] = rest.split("{privacy}");
                  return (
                    <>
                      {before}
                      <Link
                        href="/oferta"
                        target="_blank"
                        className="font-semibold text-primary underline"
                      >
                        {m.consent.offer}
                      </Link>
                      {middle}
                      <Link
                        href="/maxfiylik"
                        target="_blank"
                        className="font-semibold text-primary underline"
                      >
                        {m.consent.privacy}
                      </Link>
                      {after}
                    </>
                  );
                })()}
              </span>
            </label>
            <FieldError message={e.consent} />
          </div>
        )}

        {state.error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
          {pending ? m.lead.sending : isSignup ? m.signup.submit : m.lead.submit}
        </Button>

        {isSignup && (
          <p className="text-center text-sm text-muted-foreground">
            {m.signup.haveAccount}{" "}
            <Link href="/login" className="font-semibold text-primary underline">
              {m.signup.login}
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
