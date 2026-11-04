"use client";

import { useState, useTransition } from "react";
import {
  resetStaffPasswordAction,
  setStaffActiveAction,
} from "@/app/(dashboard)/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import { t, uz } from "@/lib/i18n/uz";
import { PasswordReveal } from "./password-reveal";

type Props = { id: string; name: string; phone: string; isActive: boolean };

export function StaffRowActions({ id, name, phone, isActive }: Props) {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState<string>();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !isActive}
          onClick={() =>
            start(async () => {
              const res = await resetStaffPasswordAction(id);
              setPassword(res.password);
              setError(res.error);
            })
          }
        >
          {uz.staff.resetPassword}
        </Button>
        <Button
          size="sm"
          variant={isActive ? "destructive" : "outline"}
          disabled={pending}
          onClick={() => {
            if (isActive && !window.confirm(uz.staff.confirmBlock)) return;
            start(async () => setError((await setStaffActiveAction(id, !isActive)).error));
          }}
        >
          {isActive ? uz.staff.block : uz.staff.unblock}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {password && (
        <div className="w-full max-w-sm text-left">
          <PasswordReveal
            title={t(uz.staff.newPasswordFor, { name })}
            login={phone}
            password={password}
          />
        </div>
      )}
    </div>
  );
}
