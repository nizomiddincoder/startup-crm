"use client";

import { useState, useTransition } from "react";
import { setProductActiveAction } from "@/app/(dashboard)/dashboard/products/actions";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

export function ArchiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={isActive ? "destructive" : "outline"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await setProductActiveAction(id, !isActive);
            setError(result.error);
          })
        }
      >
        {isActive ? uz.products.archive : uz.products.restore}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
