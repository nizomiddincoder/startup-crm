"use client";

import { useState, useTransition } from "react";
import {
  resetStaffPasswordAction,
  resetStaffPinAction,
  setStaffActiveAction,
} from "@/app/(dashboard)/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import { t, uz } from "@/lib/i18n/uz";
import { PasswordReveal } from "./password-reveal";

type Props = { id: string; name: string; phone: string; isActive: boolean; role: string };

export function StaffRowActions({ id, name, phone, isActive, role }: Props) {
  const [pending, start] = useTransition();
  const [secret, setSecret] = useState<{ password?: string; pin?: string }>();
  const [error, setError] = useState<string>();
  const isCashier = role === "CASHIER";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !isActive}
          onClick={() =>
            start(async () => {
              // Kassir — PIN; boshqalar — parol
              if (isCashier) {
                const res = await resetStaffPinAction(id);
                setSecret(res.pin ? { pin: res.pin } : undefined);
                setError(res.error);
              } else {
                const res = await resetStaffPasswordAction(id);
                setSecret(res.password ? { password: res.password } : undefined);
                setError(res.error);
              }
            })
          }
        >
          {isCashier ? uz.staff.resetPin : uz.staff.resetPassword}
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
      {secret && (
        <div className="w-full max-w-sm text-left">
          <PasswordReveal
            title={t(isCashier ? uz.staff.newPinFor : uz.staff.newPasswordFor, { name })}
            login={isCashier ? undefined : phone}
            password={secret.password}
            pin={secret.pin}
          />
        </div>
      )}
    </div>
  );
}
