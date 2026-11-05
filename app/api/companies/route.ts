import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUserCompanies } from "@/lib/services/companies";
import { isSessionActive } from "@/lib/services/auth";

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

  const companies = await listUserCompanies(user.id);
  return NextResponse.json({ companies });
}
