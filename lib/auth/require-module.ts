import { notFound } from "next/navigation";
import type { ModuleId } from "@/lib/modules";
import { hasModule } from "@/lib/services/modules";

/** Sahifa (layout) va action uchun: modul tarifda o'chiq bo'lsa — 404. */
export async function requireModule(tenantId: string, module: ModuleId) {
  if (!(await hasModule(tenantId, module))) notFound();
}
