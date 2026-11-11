import { AppShell } from "@/components/features/layout/app-shell";
import { requireUser } from "@/lib/auth/session";

// Hisob sozlamalari — barcha kirgan (kassirdan tashqari) foydalanuvchilar uchun, menyu bilan
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
