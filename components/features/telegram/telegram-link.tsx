"use client";

import { useActionState, useTransition } from "react";
import {
  saveTelegramPrefsAction,
  unlinkTelegramAction,
} from "@/app/(dashboard)/dashboard/telegram/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";

type Props = {
  linked: boolean;
  reports: boolean;
  reminders: boolean;
  loginConfirm: boolean;
  /** Egasi/menejer — hisobot sozlamalari ham */
  canReports: boolean;
  botUrl: string | null;
};

/**
 * Telegram holati va sozlamalari. Ulanish — kod va havolasiz: botda "Telefon raqamni yuborish".
 */
export function TelegramLink({
  linked,
  reports,
  reminders,
  loginConfirm,
  canReports,
  botUrl,
}: Props) {
  const [pending, start] = useTransition();
  const [prefsState, savePrefs, saving] = useActionState<ActionState, FormData>(
    saveTelegramPrefsAction,
    {},
  );

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">{uz.estimates.status}:</span>
        <Badge variant={linked ? "default" : "secondary"} data-testid="telegram-status">
          {linked ? uz.telegram.linked : uz.telegram.notLinked}
        </Badge>
        {linked && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => start(() => unlinkTelegramAction())}
          >
            {uz.telegram.unlink}
          </Button>
        )}
      </div>

      {!linked && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card">
          <p className="text-sm">{uz.telegram.howToLink}</p>
          {botUrl && (
            <a
              href={botUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: "lg", className: "self-start" })}
              data-testid="telegram-open-bot"
            >
              {uz.telegram.openBot}
            </a>
          )}
        </div>
      )}

      {linked && (
        <form
          action={savePrefs}
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card"
        >
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="loginConfirm"
              defaultChecked={loginConfirm}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              {uz.telegram.loginConfirm}
              <span className="block text-xs text-muted-foreground">
                {uz.telegram.loginConfirmHint}
              </span>
            </span>
          </label>
          {canReports && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="reports"
                  defaultChecked={reports}
                  className="size-4 accent-primary"
                />
                {uz.telegram.reports}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="reminders"
                  defaultChecked={reminders}
                  className="size-4 accent-primary"
                />
                {uz.telegram.reminders}
              </label>
            </>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={saving}>
              {uz.common.save}
            </Button>
            {prefsState.ok && <span className="text-sm text-success">{uz.telegram.saved}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
