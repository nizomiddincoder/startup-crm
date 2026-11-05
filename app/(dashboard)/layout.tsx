import { AppShell } from "@/components/features/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { SECTION_ACCESS } from "@/lib/services/permissions";
import { resolveUserSession } from "@/lib/services/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser(SECTION_ACCESS["/dashboard"]);
  const resolved = await resolveUserSession();
  const user = resolved ?? {
    id: "",
    name: "",
    role: "OWNER" as const,
    tenantId: "",
    tenantName: "",
    phone: "",
    branchId: null,
  };
  return <AppShell user={user}>{children}</AppShell>;
}
