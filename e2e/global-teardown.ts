import { PrismaClient } from "@prisma/client";

/** E2E testlar demo do'konda yaratgan ("E2E " bilan boshlanadigan) yozuvlarni tozalaydi. */
export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try {
    const tenantId = "demo-shop";
    const where = { tenantId, name: { startsWith: "E2E " } };
    const products = await prisma.product.findMany({ where, select: { id: true } });
    const productIds = products.map((p) => p.id);

    // Test mahsulotlarining ombor harakatlari va hujjat qatorlari, so'ng bo'sh qolgan hujjatlar
    await prisma.stockMovement.deleteMany({ where: { tenantId, productId: { in: productIds } } });
    await prisma.stockDocumentItem.deleteMany({
      where: { tenantId, productId: { in: productIds } },
    });
    await prisma.stockDocument.deleteMany({ where: { tenantId, items: { none: {} } } });

    await prisma.promotion.deleteMany({ where });
    await prisma.product.deleteMany({ where });
    await prisma.category.deleteMany({ where });

    // Test mijozlari: hisob yozuvlari, sotuvlardagi havolalar, so'ng mijozlarning o'zi
    const customers = await prisma.customer.findMany({ where, select: { id: true } });
    const customerIds = customers.map((c) => c.id);
    await prisma.ledgerEntry.deleteMany({ where: { tenantId, customerId: { in: customerIds } } });
    await prisma.sale.updateMany({
      where: { tenantId, customerId: { in: customerIds } },
      data: { customerId: null },
    });
    await prisma.sale.updateMany({
      where: { tenantId, masterId: { in: customerIds } },
      data: { masterId: null },
    });
    await prisma.customer.deleteMany({ where });

    // Test xodimlari (sotuvi yo'q) va admin testida yaratilgan do'konlar
    await prisma.user.deleteMany({
      where: { tenantId, name: { startsWith: "E2E " }, sales: { none: {} } },
    });
    await prisma.tenant.deleteMany({ where: { name: { startsWith: "E2E " } } });

    // Sotuv saytidan yuborilgan test arizalari va "Yordam" so'rovlari
    await prisma.lead.deleteMany({ where: { name: { startsWith: "E2E " } } });
    await prisma.supportRequest.deleteMany({ where: { message: { startsWith: "E2E " } } });
    await prisma.newsPost.deleteMany({ where: { title: { startsWith: "E2E " } } });
  } finally {
    await prisma.$disconnect();
  }
}
