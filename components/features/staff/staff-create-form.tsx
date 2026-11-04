"use client";

import { useActionState } from "react";
import {
  createStaffAction,
  type StaffActionState,
} from "@/app/(dashboard)/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { t, uz } from "@/lib/i18n/uz";
import { STAFF_ROLES } from "@/lib/validation/staff";
import { PasswordReveal } from "./password-reveal";

export function StaffCreateForm() {
  const [state, action, pending] = useActionState<StaffActionState, FormData>(
    createStaffAction,
    {},
  );
  const e = state.fieldErrors ?? {};
  const v = state.ok ? {} : (state.values ?? {});

  return (
    <div className="flex flex-col gap-4">
      <form
        action={action}
        className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-card"
        noValidate
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="staff-name">{uz.staff.name}</Label>
          <Input id="staff-name" name="name" defaultValue={v.name} aria-invalid={!!e.name} />
        </div>
        <div className="flex min-w-44 flex-col gap-1.5">
          <Label htmlFor="staff-phone">{uz.staff.phone}</Label>
          <Input
            id="staff-phone"
            name="phone"
            type="tel"
            placeholder={uz.auth.phonePlaceholder}
            defaultValue={v.phone}
            aria-invalid={!!e.phone}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-role">{uz.staff.role}</Label>
          <NativeSelect id="staff-role" name="role" defaultValue={v.role ?? "CASHIER"}>
            {STAFF_ROLES.map((r) => (
              <NativeSelectOption key={r} value={r}>
                {uz.roles[r]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" disabled={pending}>
          {uz.staff.add}
        </Button>
        {(e.name || e.phone || e.role || state.error) && (
          <p className="w-full text-sm text-destructive">
            {e.name ?? e.phone ?? e.role ?? state.error}
          </p>
        )}
      </form>
      {state.created && (
        <PasswordReveal
          title={t(uz.staff.newPasswordFor, { name: state.created.name })}
          login={state.created.phone}
          password={state.created.password}
        />
      )}
    </div>
  );
}
