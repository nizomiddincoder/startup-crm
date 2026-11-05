import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSessionActive } from "@/lib/services/auth";
import { saveOnboarding, subscriptionState } from "@/lib/services/companies";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user || typeof user.id !== "string" || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const active = await isSessionActive({
    userId: user.id,
    tenantId: user.tenantId ?? "",
    loginAt: user.loginAt ?? 0,
    sid: user.sid ?? "",
  });
  if (!active) {
    return NextResponse.json({ error: "Session not active" }, { status: 401 });
  }
  const tenantId = user.tenantId;
  const state = await subscriptionState(tenantId);
  if (state.readOnly) {
    return NextResponse.json({ error: "Trial ended", readOnly: true, tenant: state }, { status: 403 });
  }
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { businessType: true, plannedBranches: true, customersRange: true, onboardingDoneAt: true },
  });
  return NextResponse.json({
    businessType: tenant?.businessType ?? null,
    plannedBranches: tenant?.plannedBranches ?? null,
    customersRange: tenant?.customersRange ?? null,
    onboardingDoneAt: tenant?.onboardingDoneAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user;
  if (!user || typeof user.id !== "string" || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const active = await isSessionActive({
    userId: user.id,
    tenantId: user.tenantId ?? "",
    loginAt: user.loginAt ?? 0,
    sid: user.sid ?? "",
  });
  if (!active) {
    return NextResponse.json({ error: "Session not active" }, { status: 401 });
  }
  const tenantId = user.tenantId;
  const state = await subscriptionState(tenantId);
  if (state.readOnly) {
    return NextResponse.json({ error: "Trial ended", readOnly: true }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const input = {
    businessType: body.businessType,
    plannedBranches: body.plannedBranches,
    customersRange: body.customersRange ?? null,
  };
  const saved = await saveOnboarding(tenantId, input);
  return NextResponse.json({ ok: true, ...saved });
}
