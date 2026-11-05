import { NextRequest, NextResponse } from "next/server";
import { markPaymentPaid, markPaymentCancelled } from "@/lib/services/billing";
import { verifyClickSignature, paymeAuthValid } from "@/lib/billing/providers";

type Provider = "click" | "payme";

export async function POST(req: NextRequest) {
  const provider = (req.nextUrl.pathname.match(/^\/api\/billing\/webhooks\/([^\/]+)$/) ?? [])[1] as Provider | undefined;
  if (provider !== "click" && provider !== "payme") {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  if (provider === "click") {
    return handleClick(body, req);
  }
  if (provider === "payme") {
    const authHeader = req.headers.get("authorization");
    if (!paymeAuthValid(authHeader)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handlePayme(body, req);
  }

  return NextResponse.json({ error: "Provider handler not found" }, { status: 500 });
}

async function handleClick(params: Record<string, unknown>, req: NextRequest) {
  const str = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")]),
  );
  if (!verifyClickSignature(str)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const action = str.action;
  const transactionParam = str.transaction_param ?? str.trans_id;

  if (action === "pay") {
    const paymentId = transactionParam;
    if (typeof paymentId !== "string" || paymentId.length < 3) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }
    const paid = await markPaymentPaid(paymentId, `click:${str.merchant_trans_id ?? ""}`);
    if (!paid) return NextResponse.json({ error: "Payment not found" }, { status: 400 });
    return NextResponse.json({ ok: true, paymentId: paid.id, status: paid.status });
  }

  if (action === "error" || action === "cancel") {
    const paymentId = transactionParam;
    if (typeof paymentId !== "string" || paymentId.length < 3) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }
    const cancelled = await markPaymentCancelled(paymentId, `click:${action}`);
    if (!cancelled) return NextResponse.json({ error: "Payment not found" }, { status: 400 });
    return NextResponse.json({ ok: true, paymentId: cancelled.id, status: cancelled.status });
  }

  return NextResponse.json({ error: "Unknown click action" }, { status: 400 });
}

async function handlePayme(body: Record<string, unknown>, req: NextRequest) {
  const action = body?.action;
  const orderId = body?.order_id;
  if (typeof orderId !== "string" || orderId.length < 3) {
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }
  if (action === 1) {
    const paid = await markPaymentPaid(orderId, `payme:${String(body?.id ?? "")}`);
    if (!paid) return NextResponse.json({ error: "Payment not found" }, { status: 400 });
    return NextResponse.json({ ok: true, paymentId: paid.id, status: paid.status });
  }
  if (action === 2) {
    const cancelled = await markPaymentCancelled(orderId, `payme:cancel`);
    if (!cancelled) return NextResponse.json({ error: "Payment not found" }, { status: 400 });
    return NextResponse.json({ ok: true, paymentId: cancelled.id, status: cancelled.status });
  }
  return NextResponse.json({ error: "Unknown payme action" }, { status: 400 });
}
