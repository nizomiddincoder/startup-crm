"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setOrderStatusAction } from "@/app/pos/orders/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

type Status = "NEW" | "ACCEPTED" | "READY";

/** Buyurtma tugmalari: qabul qilish → tayyor (mijozga xabar) → kassaga yuklash; bekor qilish. */
export function OrderActions({ id, status }: { id: string; status: Status }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  function run(next: "ACCEPTED" | "READY" | "CANCELLED") {
    if (next === "CANCELLED" && !window.confirm(uz.orders.confirmCancel)) return;
    setError(undefined);
    start(async () => {
      const res = await setOrderStatusAction(id, next);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link href={`/pos?order=${id}`} className={buttonVariants({ size: "lg" })}>
          {uz.orders.loadToPos}
        </Link>
        {status === "NEW" && (
          <Button variant="outline" size="lg" disabled={pending} onClick={() => run("ACCEPTED")}>
            {uz.orders.accept}
          </Button>
        )}
        {status !== "READY" && (
          <Button variant="outline" size="lg" disabled={pending} onClick={() => run("READY")}>
            {uz.orders.ready}
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => run("CANCELLED")}
          className="text-destructive"
        >
          {uz.orders.cancel}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
