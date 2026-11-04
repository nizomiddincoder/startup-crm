import { db } from "@/lib/db";

// Server va baza ishlayotganini tekshirish (Railway healthcheck, monitoring)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
