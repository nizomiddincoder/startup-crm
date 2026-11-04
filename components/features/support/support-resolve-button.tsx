"use client";

import { useTransition } from "react";
import { setSupportResolvedAction } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

export function SupportResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={resolved ? "ghost" : "outline"}
      className="ml-auto"
      disabled={pending}
      onClick={() => start(() => setSupportResolvedAction(id, !resolved))}
    >
      {resolved ? uz.support.reopen : uz.support.resolve}
    </Button>
  );
}
