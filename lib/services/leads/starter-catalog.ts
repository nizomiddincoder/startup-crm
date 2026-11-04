/**
 * Saytda o'zi ro'yxatdan o'tgan do'kon uchun namunaviy katalog — kabinet bo'sh ko'rinmasin va
 * kassani darhol sinab ko'rish mumkin bo'lsin. Narxlar taxminiy (so'm), egasi o'zgartiradi
 * yoki arxivlaydi. Shtrix-kod yo'q — do'konning haqiqiy kodlari bilan to'qnashmasin.
 */
import type { Prisma, Unit } from "@prisma/client";

type StarterProduct = { name: string; unit: Unit; salePrice: number; costPrice: number };

export const STARTER_CATALOG: { category: string; products: StarterProduct[] }[] = [
  {
    category: "Sement va quruq aralashmalar",
    products: [
      { name: "Sement M400, 50 kg", unit: "BAG", salePrice: 62000, costPrice: 55000 },
      { name: "Plitka yelimi, 25 kg", unit: "BAG", salePrice: 58000, costPrice: 50000 },
    ],
  },
  {
    category: "Armatura va metall",
    products: [
      { name: "Armatura 12 mm", unit: "METER", salePrice: 9500, costPrice: 8200 },
      { name: "Sim 1.2 mm (bog'lash)", unit: "KG", salePrice: 18000, costPrice: 15000 },
    ],
  },
  {
    category: "G'isht va bloklar",
    products: [
      { name: "G'isht pishgan, M100", unit: "PIECE", salePrice: 1300, costPrice: 1050 },
      { name: "Gazoblok 600×300×200", unit: "CUBIC_METER", salePrice: 780000, costPrice: 690000 },
    ],
  },
  {
    category: "Bo'yoqlar",
    products: [{ name: "Emulsiya oq, 10 l", unit: "PIECE", salePrice: 165000, costPrice: 140000 }],
  },
  {
    category: "Qum va shag'al",
    products: [
      { name: "Qum (yuvilgan)", unit: "CUBIC_METER", salePrice: 180000, costPrice: 150000 },
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
