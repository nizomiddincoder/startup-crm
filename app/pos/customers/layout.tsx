import { requireUser } from "@/lib/auth/session";
import { requireModule } from "@/lib/auth/require-module";

/** Modul tarifda o'chiq bo'lsa — sahifa ochilmaydi (lib/modules.ts). */
export default async function ModuleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await requireModule(user.tenantId, "customers");
  return children;
}
