import { AppShell } from "@/components/features/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { SECTION_ACCESS } from "@/lib/services/permissions";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(SECTION_ACCESS["/pos"]);
  return <AppShell user={user}>{children}</AppShell>;
}
