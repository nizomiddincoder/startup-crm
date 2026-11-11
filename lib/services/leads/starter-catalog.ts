/**
 * Yangi do'konga namunaviy katalog — kabinet bo'sh ko'rinmasin. Narxlar taxminiy (so'm),
 * egasi o'zgartiradi yoki arxivlaydi. Shtrix-kod yo'q — do'konning haqiqiy kodlari bilan to'qnashmasin.
 */
import type { Prisma, Unit } from "@prisma/client";

type StarterProduct = { name: string; unit: Unit; salePrice: number; costPrice: number };

export const STARTER_CATALOG: { category: string; products: StarterProduct[] }[] = [
  {
    category: "Qora shokolad",
    products: [
      { name: "Qora shokolad 70%, 100 g", unit: "PIECE", salePrice: 14000, costPrice: 11000 },
      { name: "Qora shokolad, karton (24 dona)", unit: "BOX", salePrice: 320000, costPrice: 262000 },
    ],
  },
  {
    category: "Sut shokoladi",
    products: [
      { name: "Sut shokoladi, 90 g", unit: "PIECE", salePrice: 12000, costPrice: 9500 },
    ],
  },
  {
    category: "Konfetlar",
    products: [
      { name: "Shokoladli konfet assorti", unit: "KG", salePrice: 95000, costPrice: 78000 },
    ],
  },
];

/** Yangi do'konga namunaviy kategoriya va mahsulotlarni yozadi (tranzaksiya ichida). */
export async function createStarterCatalog(tx: Prisma.TransactionClient, tenantId: string) {
  for (const group of STARTER_CATALOG) {
    const category = await tx.category.create({ data: { tenantId, name: group.category } });
    await tx.product.createMany({
      data: group.products.map((p) => ({ ...p, tenantId, categoryId: category.id })),
    });
  }
}
