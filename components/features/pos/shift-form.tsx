"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeShiftAction, openShiftAction, type CreatedState } from "@/app/pos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t, uz } from "@/lib/i18n/uz";

/** Smenani ochish (kassadagi naqd bilan) yoki yopish (sanalgan naqd bilan). */
export function ShiftForm({ kind }: { kind: "open" | "close" }) {
  const router = useRouter();
  const [cash, setCash] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [pending, start] = useTransition();
  const isOpen = kind === "open";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        start(async () => {
          const res: CreatedState = isOpen
            ? await openShiftAction({ cash, note })
            : await closeShiftAction({ cash, note });
          if (!res.ok) {
            setError(res.error ?? res.fieldErrors?.cash);
            return;
          }
          if (!isOpen && res.number) setDone(t(uz.shifts.closedDone, { number: res.number }));
          setCash("");
          setNote("");
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`shift-cash-${kind}`}>
          {isOpen ? uz.shifts.openingCash : uz.shifts.countedCash}
        </Label>
        <Input
          id={`shift-cash-${kind}`}
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          inputMode="numeric"
          placeholder="0"
          className="h-11 text-right text-lg tabular-nums"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {isOpen ? uz.shifts.openingCashHint : uz.shifts.countedCashHint}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`shift-note-${kind}`}>{uz.shifts.note}</Label>
        <Input id={`shift-note-${kind}`} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm font-semibold text-primary">
          {done}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className={isOpen ? undefined : "bg-destructive text-white hover:bg-destructive/90"}
      >
        {pending ? uz.pos.saving : isOpen ? uz.shifts.open : uz.shifts.close}
      </Button>
    </form>
  );
}
