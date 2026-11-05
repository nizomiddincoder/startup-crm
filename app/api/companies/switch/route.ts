import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { switchCompany } from "@/lib/services/companies";
import { isSessionActive } from "@/lib/services/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user;
  if (!user || typeof user.id !== "string" || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const tenantId = body?.tenantId;
  if (typeof tenantId !== "string" || tenantId.length < 3) {
    return NextResponse.json({ error: "Invalid tenant" }, { status: 400 });
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

  const result = await switchCompany(user.id, tenantId);
  return NextResponse.json({ ok: true, tenantId: result.tenantId, tenantName: result.tenantName, role: result.role });
}
