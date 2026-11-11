import { TelegramLink } from "@/components/features/telegram/telegram-link";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { canReceiveReports } from "@/lib/services/permissions";
import { telegramConfig } from "@/lib/services/telegram/config";
import { getTelegramPrefs } from "@/lib/services/telegram/linking";

/**
 * Telegram: holat va sozlamalar. Ulanish botning o'zida — "Telefon raqamni yuborish"
 * (bot raqam bo'yicha xodimni taniydi), saytda kod yoki havola yo'q.
 */
export default async function TelegramPage() {
  const user = await requireUser();
  const config = telegramConfig();
  const prefs = await getTelegramPrefs(user.tenantId, user.id);
  const canReports = canReceiveReports(user.role);

  return (
    <main className="flex flex-col gap-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{uz.telegram.title}</h1>
      <p className="max-w-2xl text-muted-foreground">
        {uz.telegram.staffIntro} {canReports && uz.telegram.intro}
      </p>
      {config.username ? (
        <p className="text-sm">
          Bot: <span className="font-mono">@{config.username}</span>
          {canReports && ` · ${config.reportHour}:00 / ${config.reminderHour}:00`}
        </p>
      ) : (
        <p className="max-w-2xl rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
          {uz.telegram.notConfigured}
        </p>
      )}
      {canReports && config.username && (
        <section className="flex max-w-2xl flex-col gap-1 rounded-2xl border bg-card p-4 shadow-card">
          <h2 className="font-semibold">{uz.telegram.customerLinkTitle}</h2>
          <p className="font-mono text-sm break-all">
            {`https://t.me/${config.username}?start=s_${user.tenantId}`}
          </p>
          <p className="text-sm text-muted-foreground">{uz.telegram.customerLinkHint}</p>
        </section>
      )}
      <TelegramLink
        {...prefs}
        canReports={canReports}
        botUrl={config.username ? `https://t.me/${config.username}` : null}
      />
      {canReports && (
        <p className="max-w-2xl text-sm text-muted-foreground">{uz.telegram.customersHint}</p>
      )}
    </main>
  );
}
