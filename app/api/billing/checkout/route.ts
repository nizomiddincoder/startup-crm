import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSessionActive } from "@/lib/services/auth";
import { createCheckout, amountFor, parsePurpose, requestModule } from "@/lib/services/billing";
import { assertSubscriptionActive } from "@/lib/services/companies";
import { availableProviders } from "@/lib/billing/providers";
import { isSaaSPlan } from "@/lib/plans";
import { isModuleId } from "@/lib/modules";

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
  // Billing settings view requires active subscription (trial considered active for checkout too).
  await assertSubscriptionActive(tenantId);

  const body = await req.json().catch(() => ({}));
  const purpose = body?.purpose;
  const providerKey = body?.provider;
  const months = body?.months ?? 1;

  if (typeof purpose !== "string" || !purpose) {
    return NextResponse.json({ error: "Missing purpose" }, { status: 400 });
  }
  const parsed = parsePurpose(purpose);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }
  if (parsed.startsWith("plan:")) {
    const planId = parsed.split(":")[1];
    if (!isSaaSPlan(planId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
  } else if (parsed.startsWith("module:")) {
    const moduleKey = parsed.split(":")[1];
    if (!isModuleId(moduleKey)) {
      return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }
  }

  if (typeof providerKey !== "string" || !availableProviders().includes(providerKey)) {
    return NextResponse.json({ error: "Provider not available" }, { status: 400 });
  }

  // Free modules (amount === 0) go straight to request, not checkout.
  const amount = amountFor(parsed, 1);
  if (amount === 0) {
    const modKey = parsed.split(":")[1];
    const modReq = await requestModule(tenantId, modKey);
    return NextResponse.json({ ok: true, free: true, moduleRequest: { moduleKey: modReq.moduleKey, status: modReq.status, createdAt: modReq.createdAt } });
  }

  const checkout = await createCheckout(tenantId, purpose, providerKey, months);
  if (!checkout.paymentId || !checkout.redirectUrl) {
    return NextResponse.json({ error: "Checkout not available" }, { status: 500 });
  }
  return NextResponse.json(checkout);
}
