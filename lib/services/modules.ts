import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import {
  effectiveModules,
  isPlanId,
  modulesOffFor,
  PLAN_MODULES,
  type ModuleId,
} from "@/lib/modules";
import { ServiceError } from "./errors";

/** Do'konda yoqiq modullar: tarif to'plami + to'langan qo'shimchalar − o'chirilganlar. */
export async function tenantModules(tenantId: string): Promise<Set<ModuleId>> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, modulesOff: true },
  });
  const activated = await db.moduleRequest.findMany({
    where: { tenantId, status: "ACTIVATED" },
    select: { moduleKey: true },
  });
  return effectiveModules({
    plan: tenant?.plan ?? "custom",
    modulesOff: tenant?.modulesOff ?? [],
    extra: activated.map((r) => r.moduleKey),
  });
}

export async function hasModule(tenantId: string, module: ModuleId) {
  return (await tenantModules(tenantId)).has(module);
}

/** Server action / servis uchun: modul o'chiq bo'lsa — tushunarli xato. */
export async function assertModule(tenantId: string, module: ModuleId) {
  if (!(await hasModule(tenantId, module))) throw new ServiceError(uz.modules.off);
}

/**
 * Admin: tarif va modullar. `modules` berilmasa — tarifning sukut to'plami.
 * ISTISNO (admin.ts kabi): tenantId admin tanlagan do'kon, sessiyadan emas.
 */
export async function setTenantModules(tenantId: string, plan: string, modules?: string[]) {
  if (!isPlanId(plan)) throw new ServiceError(uz.validation.invalidChoice, "plan");
  const enabled = modules ?? [...PLAN_MODULES[plan]];
  await db.tenant.update({
    where: { id: tenantId },
    data: { plan, modulesOff: modulesOffFor(enabled) },
  });
}
