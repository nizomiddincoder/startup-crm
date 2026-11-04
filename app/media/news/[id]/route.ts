import { auth } from "@/auth";
import { newsImage, newsImageForAdmin } from "@/lib/services/news";

/** Yangilik rasmi: chop etilganlari — hammaga (sayt); `?admin=1` — admin (qoralama ham). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let image: { data: Uint8Array; mime: string } | null = null;
  if (new URL(request.url).searchParams.get("admin") === "1") {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") return new Response(null, { status: 403 });
    image = await newsImageForAdmin(id);
  } else {
    image = await newsImage(id);
  }
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: { "content-type": image.mime, "cache-control": "public, max-age=86400" },
  });
}
