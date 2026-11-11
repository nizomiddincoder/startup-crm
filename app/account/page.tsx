import { redirect } from "next/navigation";
import { PageHeader } from "@/components/features/layout/page-header";
import { PasswordForm } from "@/components/features/account/password-form";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

export default async function AccountPage() {
  const user = await requireUser();
  // Kassir PIN bilan kiradi — parol sahifasi kerak emas
  if (user.role === "CASHIER") redirect("/pos");

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title={uz.account.title} eyebrow={user.name} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{uz.account.passwordTitle}</h2>
        <PasswordForm />
      </section>
    </main>
  );
}
