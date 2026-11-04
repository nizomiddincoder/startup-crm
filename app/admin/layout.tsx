import { AppShell } from "@/components/features/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { SECTION_ACCESS } from "@/lib/services/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(SECTION_ACCESS["/admin"]);
  return <AppShell user={user}>{children}</AppShell>;
}
