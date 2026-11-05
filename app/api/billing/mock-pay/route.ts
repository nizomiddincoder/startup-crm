import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSessionActive } from "@/lib/services/auth";
import { markPaymentPaid } from "@/lib/services/billing";

export async function GET(req: NextRequest) {
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

  const paymentId = req.nextUrl.searchParams.get("payment");
  if (typeof paymentId !== "string" || paymentId.length < 3) {
    return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
  }

  const paid = await markPaymentPaid(paymentId);
  if (!paid || paid.status !== "PAID") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, paymentId: paid.id, status: paid.status, paidAt: paid.paidAt });
}
