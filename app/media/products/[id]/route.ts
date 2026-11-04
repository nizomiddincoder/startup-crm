import { auth } from "@/auth";
import { getProductImage } from "@/lib/services/product-images";

/**
 * Mahsulot rasmi: /media/products/<id>?v=<versiya>[&kind=original]. Faqat shu do'kon xodimiga.
 * Manzilda versiya bor — brauzer rasmni uzoq saqlaydi, o'zgarganda yangi manzil bo'ladi.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });
  const { id } = await params;
  const kind =
    new URL(request.url).searchParams.get("kind") === "original" ? "ORIGINAL" : "STANDARD";
  const image =
    (await getProductImage(session.user.tenantId, id, kind)) ??
    (kind === "STANDARD" ? null : await getProductImage(session.user.tenantId, id, "STANDARD"));
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "content-type": image.mime,
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
