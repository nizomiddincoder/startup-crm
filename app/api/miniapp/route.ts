/**
 * Telegram Mini App (do'kon ilovasi) API. Har so'rov Telegram imzosi bilan keladi
 * (sarlavha: X-Telegram-Init-Data). Mijoz faqat o'z chat'iga bog'langan do'konlarda ishlaydi.
 * Biznes mantiq: lib/services/orders.ts. Buyurtma kassaga "Yangi" holatida tushadi.
 */
import { ZodError } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { uz } from "@/lib/i18n/uz";
import { ServiceError } from "@/lib/services/errors";
import {
  catalogCategories,
  catalogProducts,
  changeDraftItem,
  clearDraft,
  customerOrders,
  customerShopsByChatId,
  getDraft,
  orderCustomer,
  submitDraft,
} from "@/lib/services/orders";
import { validateInitData } from "@/lib/services/telegram/miniapp";
import { notifyStaffOfOrder } from "@/lib/services/telegram/order-notify";
import { catalogQuerySchema, shopActionSchema } from "@/lib/validation/miniapp";

export const dynamic = "force-dynamic";

const INIT_HEADER = "x-telegram-init-data";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Telegram imzosi tekshiriladi — chat ID shundan olinadi (so'rov ichidagidan emas). */
function chatIdFrom(req: NextRequest) {
  const user = validateInitData(req.headers.get(INIT_HEADER) ?? "");
  return String(user.id);
}

/** Mijoz shu chat'niki bo'lsa — uning do'koni. Aks holda — xato. */
async function ownShop(chatId: string, customerId: string) {
  const shop = await orderCustomer(chatId, customerId);
  if (!shop) throw new ServiceError(uz.bot.orderExpired);
  return shop;
}

function failure(error: unknown) {
  if (error instanceof ServiceError) return json({ error: error.message }, 400);
  if (error instanceof ZodError) return json({ error: uz.miniapp.error }, 400);
  console.error("[miniapp]", error);
  return json({ error: uz.miniapp.error }, 500);
}

export async function GET(req: NextRequest) {
  try {
    const chatId = chatIdFrom(req);
    const url = new URL(req.url);
    const op = url.searchParams.get("op");

    if (op === "shops") {
      const shops = await customerShopsByChatId(chatId);
      return json({ shops: shops.map((s) => ({ id: s.id, shop: s.tenant.name })) });
    }

    const query = catalogQuerySchema.parse({
      customerId: url.searchParams.get("customerId") ?? "",
      category: url.searchParams.get("category") ?? undefined,
      page: url.searchParams.get("page") ?? 0,
    });
    const shop = await ownShop(chatId, query.customerId);

    if (op === "catalog") {
      const [categories, products, cart] = await Promise.all([
        catalogCategories(shop.tenantId),
        catalogProducts(shop.tenantId, query.category || null, query.page),
        getDraft(shop.tenantId, shop.id),
      ]);
      return json({ ...categories, ...products, cart });
    }
    if (op === "cart") {
      return json({ cart: await getDraft(shop.tenantId, shop.id) });
    }
    if (op === "orders") {
      return json({ orders: await customerOrders([shop.id]) });
    }
    return json({ error: uz.miniapp.error }, 400);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const chatId = chatIdFrom(req);
    const action = shopActionSchema.parse(await req.json());
    const shop = await ownShop(chatId, action.customerId);

    if (action.op === "change") {
      const line = await changeDraftItem(shop.tenantId, shop.id, action.productId, action.delta);
      return json({ ok: true, quantity: line.quantity });
    }
    if (action.op === "clear") {
      await clearDraft(shop.tenantId, shop.id);
      return json({ ok: true });
    }
    const order = await submitDraft(shop.tenantId, shop.id);
    await notifyStaffOfOrder(shop.tenantId, order);
    return json({ ok: true, number: order.number, total: order.total });
  } catch (error) {
    return failure(error);
  }
}
