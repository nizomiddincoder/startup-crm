"use client";

import { useState, useTransition } from "react";
import { cancelEstimateAction } from "@/app/pos/actions";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

export function CancelEstimateButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="lg"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(uz.estimates.confirmCancel)) return;
          start(async () => setError((await cancelEstimateAction(id)).error));
        }}
      >
        {uz.estimates.cancel}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
