import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSessionActive } from "@/lib/services/auth";
import { tenantModules, hasModule } from "@/lib/services/modules";
import { requestModule, listModuleRequests } from "@/lib/services/billing";
import { assertSubscriptionActive } from "@/lib/services/companies";

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
  const modules = await tenantModules(tenantId);
  const requests = await listModuleRequests(tenantId);
  return NextResponse.json({
    modules: Array.from(modules),
    requests: requests.map((r) => ({ moduleKey: r.moduleKey, status: r.status, createdAt: r.createdAt })),
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
  // Assert active subscription before allowing a module request.
  await assertSubscriptionActive(tenantId);

  const body = await req.json().catch(() => ({}));
  const moduleKey = body?.moduleKey;
  if (typeof moduleKey !== "string" || moduleKey.length < 3) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }
  const reqCreated = await requestModule(tenantId, moduleKey);
  return NextResponse.json({ ok: true, moduleRequest: { moduleKey: reqCreated.moduleKey, status: reqCreated.status, createdAt: reqCreated.createdAt } });
}
