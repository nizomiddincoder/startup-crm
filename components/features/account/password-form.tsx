"use client";

import { useActionState } from "react";
import { changePasswordAction, type AccountState } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uz } from "@/lib/i18n/uz";

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePasswordAction, {});
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex max-w-md flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="current">{uz.account.current}</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" aria-invalid={!!e.current} required />
        {e.current && <p className="text-sm text-destructive">{e.current}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="next">{uz.account.next}</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" aria-invalid={!!e.next} required />
        {e.next && <p className="text-sm text-destructive">{e.next}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="repeat">{uz.account.repeat}</Label>
        <Input id="repeat" name="repeat" type="password" autoComplete="new-password" aria-invalid={!!e.repeat} required />
        {e.repeat && <p className="text-sm text-destructive">{e.repeat}</p>}
      </div>
      <p className="text-xs text-muted-foreground">{uz.account.passwordHint}</p>
      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? uz.account.submitting : uz.account.submit}
      </Button>
    </form>
  );
}
