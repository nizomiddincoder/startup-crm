import { NextRequest, NextResponse } from "next/server";
import { markPaymentPaid } from "@/lib/services/billing";

type Method = "GET" | "POST";

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("payment");
  if (typeof paymentId !== "string" || paymentId.length < 3) {
    return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
  }  const paid = await markPaymentPaid(paymentId);
  if (!paid || paid.status !== "PAID") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, paymentId: paid.id, status: paid.status, paidAt: paid.paidAt });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const paymentId = body?.paymentId;
  if (typeof paymentId !== "string" || paymentId.length < 3) {
    return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
  }
  const paid = await markPaymentPaid(paymentId, "mock");
  if (!paid) return NextResponse.json({ error: "Payment not found" }, { status: 400 });
  return NextResponse.json({ ok: true, paymentId: paid.id, status: paid.status });
}
