import { AppShell } from "@/components/features/layout/app-shell";
import { requireUser } from "@/lib/auth/session";

// Dasturdagi "Yangiliklar" — barcha rollar (kassir, omborchi, egasi, admin)
export default async function NewsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
