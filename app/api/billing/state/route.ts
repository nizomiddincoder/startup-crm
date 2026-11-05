import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSessionActive } from "@/lib/services/auth";
import { subscriptionState } from "@/lib/services/companies";

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
  return NextResponse.json(state);
}
