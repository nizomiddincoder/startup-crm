"use client";

import { useTransition } from "react";
import { setTenantActiveAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

export function TenantToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={isActive ? "destructive" : "outline"}
      disabled={pending}
      onClick={() => {
        if (isActive && !window.confirm(uz.admin.confirmDisable)) return;
        start(async () => {
          await setTenantActiveAction(id, !isActive);
        });
      }}
    >
      {isActive ? uz.admin.disable : uz.admin.enable}
    </Button>
  );
}
