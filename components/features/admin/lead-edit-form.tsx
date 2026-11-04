"use client";

import { useActionState, useState } from "react";
import { updateLeadAction } from "@/app/admin/leads/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";
import { LEAD_STATUSES } from "@/lib/validation/lead";

type Props = {
  id: string;
  defaults: { status: string; lostReason: string; note: string; assignee: string };
};

export function LeadEditForm({ id, defaults }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateLeadAction.bind(null, id),
    {},
  );
  const v = { ...defaults, ...state.values };
  const [status, setStatus] = useState(v.status);
  const e = state.fieldErrors ?? {};

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-status">{uz.leads.status}</Label>
          <NativeSelect
            id="lead-status"
            name="status"
            // Eslatma: React ishga tushguncha (birinchi soniya) tanlangan qiymatni React qayta tiklaydi
            defaultValue={v.status}
            onChange={(ev) => setStatus(ev.target.value)}
            className="w-full"
          >
            {LEAD_STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {uz.leads.statuses[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-assignee">{uz.leads.assignee}</Label>
          <Input
            id="lead-assignee"
            name="assignee"
            defaultValue={v.assignee}
            placeholder={uz.leads.assigneePlaceholder}
          />
        </div>
      </div>
      {status === "LOST" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-lost">{uz.leads.lostReason}</Label>
          <Input
            id="lead-lost"
            name="lostReason"
            defaultValue={v.lostReason}
            placeholder={uz.leads.lostReasonPlaceholder}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-note">{uz.leads.note}</Label>
        <textarea
          id="lead-note"
          name="note"
          rows={4}
          defaultValue={v.note}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {(state.error || Object.values(e)[0]) && (
        <p className="text-sm text-destructive">{state.error ?? Object.values(e)[0]}</p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {uz.leads.save}
        </Button>
        {state.ok && <span className="text-sm text-success">{uz.leads.saved}</span>}
      </div>
    </form>
  );
}
