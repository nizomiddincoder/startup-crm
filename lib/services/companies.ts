/**
 * Kompaniyalar (tenantlar): bir eganing bir nechta kompaniyasi, kompaniya tanlash,
 * onboarding va obuna holati. Har so'rov sessiyadan olingan tenantId/userId bilan.
 */
import { db } from "@/lib/db";
import { uz } from "@/lib/i18n/uz";
import { BUSINESS_TYPE_MODULES, isBusinessTypeId, isModuleId, modulesOffFor, type BusinessTypeId } from "@/lib/modules";
import { subscriptionReadOnly, trialEndsAtFromNow, planLimits, isSaaSPlan, SAAS_PLANS } from "@/lib/plans";
import { ServiceError } from "./errors";

/** Foydalanuvchining kompaniyalari (Membership bo'yicha). */
export async function listUserCompanies(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { tenant: { select: { id: true, name: true, isActive: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships
    .filter((m) => m.tenant.isActive)
    .map((m) => ({ tenantId: m.tenantId, name: m.tenant.name, role: m.role, branchId: m.branchId }));
}

/** Yangi kompaniya: 30 kunlik sinov, bitta "Asosiy" filial, OWNER a'zolik. */
export async function createCompanyForOwner(userId: string, name: string) {
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 60) {
    throw new ServiceError(uz.companies.nameInvalid, "name");
  }
  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: clean,
        plan: "start",
        planStatus: "TRIAL",
        trialEndsAt: trialEndsAtFromNow(),
        branches: { create: { name: uz.branches.defaultName, isDefault: true } },
      },
    });
    const membership = await tx.membership.create({
      data: { userId, tenantId: tenant.id, role: "OWNER" },
    });
    await tx.user.update({ where: { id: userId }, data: { tenantId: tenant.id, role: "OWNER" } });
    return { tenantId: tenant.id, name: tenant.name, role: membership.role };
  });
}

/** Kompaniyaga o'tishdan oldin tekshiruv: a'zolik bormi. Sessiyani action yangilaydi. */
export async function switchCompany(userId: string, tenantId: string) {
  const membership = await db.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    include: { tenant: { select: { name: true, isActive: true } } },
  });
  if (!membership || !membership.tenant.isActive) throw new ServiceError(uz.companies.notFound);
  return { tenantId, tenantName: membership.tenant.name, role: membership.role };
}

/**
 * Onboarding: biznes turi, filiallar soni, oyiga mijozlar oralig'i (ixtiyoriy — "skip" → null).
 * Biznes turiga qarab modullar yoqiladi. Keyin sozlamalarda o'zgartirish mumkin.
 */
export async function saveOnboarding(
  tenantId: string,
  input: { businessType: string; plannedBranches?: number; customersRange?: string | null },
) {
  if (!isBusinessTypeId(input.businessType)) {
    throw new ServiceError(uz.validation.invalidChoice, "businessType");
  }
  const businessType: BusinessTypeId = input.businessType;
  const plannedBranches = input.plannedBranches;
  if (plannedBranches !== undefined && (plannedBranches < 1 || plannedBranches > 100)) {
    throw new ServiceError(uz.validation.invalidChoice, "plannedBranches");
  }
  const range = input.customersRange ?? null;

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { modulesOff: true } });
  if (!tenant) throw new ServiceError(uz.companies.notFound);

  const enabled = BUSINESS_TYPE_MODULES[businessType];
  // Onboarding to'plamiga qo'shimcha: avval yoqilgan (aktivlashtirilgan) modullar o'chmaydi
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      businessType,
      plannedBranches,
      customersRange: range,
      onboardingDoneAt: new Date(),
      modulesOff: modulesOffFor(enabled),
    },
  });
  return { businessType, enabledModules: enabled };
}

/** Obuna holati: tarif, chegaralar, foydalanish va "faqat o'qish" belgisi. */
export async function subscriptionState(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      planStatus: true,
      trialEndsAt: true,
      planRenewsAt: true,
      addonBranches: true,
      addonCashiers: true,
      businessType: true,
      _count: { select: { branches: true, users: true } },
    },
  });
  if (!tenant) throw new ServiceError(uz.companies.notFound);
  const limits = planLimits(tenant);
  const { _count, ...rest } = tenant;
  return {
    ...rest,
    planLabel: isSaaSPlan(tenant.plan) ? SAAS_PLANS[tenant.plan].label : "Maxsus",
    readOnly: subscriptionReadOnly(tenant),
    usage: { branches: _count.branches, cashiers: _count.users },
    limits: { branches: limits.branches, cashiers: limits.cashiers },
  };
}

/** Yozuvli amallardan oldin: hisob "faqat o'qish" rejimida bo'lmasin. */
export async function assertSubscriptionActive(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { planStatus: true, trialEndsAt: true, businessType: true },
  });
  if (tenant && subscriptionReadOnly(tenant)) throw new ServiceError(uz.subscription.readOnly);
}
