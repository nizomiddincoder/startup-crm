"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/app/(auth)/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";
import { LEAD_CITIES } from "@/lib/validation/lead-constants";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {});
  const t = uz.register;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="shopName">{t.shopName}</Label>
        <Input id="shopName" name="shopName" placeholder={t.shopPlaceholder} aria-invalid={!!state.fieldErrors?.shopName} />
        <FieldError message={state.fieldErrors?.shopName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t.name}</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder={t.namePlaceholder}
          aria-invalid={!!state.fieldErrors?.name}
          required
        />
        <FieldError message={state.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t.phone}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">+998</span>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t.phonePlaceholder}
            aria-invalid={!!state.fieldErrors?.phone}
            required
          />
        </div>
        <FieldError message={state.fieldErrors?.phone} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="city">{t.city}</Label>
        <select
          id="city"
          name="city"
          defaultValue=""
          aria-invalid={!!state.fieldErrors?.city}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          required
        >
          <option value="" disabled>
            {t.cityPlaceholder}
          </option>
          {LEAD_CITIES.map((c) => (
            <option key={c} value={c}>
              {t.cities[c]}
            </option>
          ))}
        </select>
        <FieldError message={state.fieldErrors?.city} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!state.fieldErrors?.password}
          required
        />
        <p className="text-xs text-muted-foreground">{t.passwordHint}</p>
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1" aria-invalid={!!state.fieldErrors?.consent} />
        <span>{t.consent}</span>
      </label>
      <FieldError message={state.fieldErrors?.consent} />

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
