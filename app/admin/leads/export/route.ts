import type { LeadCity, LeadStatus } from "@prisma/client";
import { auth } from "@/auth";
import { dayKey } from "@/lib/services/format";
import { leadsToCsv, listLeads } from "@/lib/services/leads/leads";
import { LEAD_CITIES, LEAD_STATUSES } from "@/lib/validation/lead";

// CSV — Google Sheets CRM'ga yuklash uchun (Fayl → Import). Faqat platforma admini.
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const city = params.get("city");
  const leads = await listLeads(
    {
      status: LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : undefined,
      city: LEAD_CITIES.includes(city as LeadCity) ? (city as LeadCity) : undefined,
    },
    10_000,
  );

  return new Response(leadsToCsv(leads), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="arizalar-${dayKey(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
