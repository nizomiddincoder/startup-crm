// Sinov ma'lumotlari: platforma admini, demo do'kon xodimlari, kategoriya va mahsulotlari.
// Faqat lokal ishlab chiqish uchun! Ishga tushirish: npm run db:seed (qayta ishga tushirsa ham xavfsiz).
import { PrismaClient, type Unit } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  DEMO_PASSWORD,
  DEMO_TENANT_ID,
  DEMO_USERS as users,
  PLATFORM_TENANT_ID,
} from "../lib/demo";

const prisma = new PrismaClient();

const categories = [
  { id: "demo-c-cement", name: "Sement va quruq aralashmalar" },
  { id: "demo-c-metal", name: "Armatura va metall" },
  { id: "demo-c-brick", name: "G'isht va bloklar" },
  { id: "demo-c-drywall", name: "Gipsokarton va profil" },
  { id: "demo-c-paint", name: "Bo'yoqlar" },
  { id: "demo-c-bulk", name: "Qum va shag'al" },
];

// Narxlar taxminiy, so'mda. Shtrix-kodlar sinov uchun o'ylab topilgan.
const products: {
  name: string;
  categoryId: string;
  unit: Unit;
  salePrice: number;
  costPrice: number | null;
  barcode: string | null;
}[] = [
  {
    name: "Sement M400, 50 kg",
    categoryId: "demo-c-cement",
    unit: "BAG",
    salePrice: 62000,
    costPrice: 55000,
    barcode: "4780000000011",
  },
  {
    name: "Sement M500, 50 kg",
    categoryId: "demo-c-cement",
    unit: "BAG",
    salePrice: 70000,
    costPrice: 62000,
    barcode: "4780000000028",
  },
  {
    name: "Shpaklyovka finish, 25 kg",
    categoryId: "demo-c-cement",
    unit: "BAG",
    salePrice: 85000,
    costPrice: 74000,
    barcode: "4780000000035",
  },
  {
    name: "Plitka yelimi, 25 kg",
    categoryId: "demo-c-cement",
    unit: "BAG",
    salePrice: 58000,
    costPrice: 50000,
    barcode: "4780000000042",
  },
  {
    name: "Armatura 12 mm",
    categoryId: "demo-c-metal",
    unit: "METER",
    salePrice: 9500,
    costPrice: 8200,
    barcode: null,
  },
  {
    name: "Armatura 12 mm (tonna)",
    categoryId: "demo-c-metal",
    unit: "TON",
    salePrice: 10800000,
    costPrice: 9900000,
    barcode: null,
  },
  {
    name: "Sim 1.2 mm (bog'lash)",
    categoryId: "demo-c-metal",
    unit: "KG",
    salePrice: 18000,
    costPrice: 15000,
    barcode: null,
  },
  {
    name: "G'isht pishgan, M100",
    categoryId: "demo-c-brick",
    unit: "PIECE",
    salePrice: 1300,
    costPrice: 1050,
    barcode: null,
  },
  {
    name: "Gazoblok 600×300×200",
    categoryId: "demo-c-brick",
    unit: "CUBIC_METER",
    salePrice: 780000,
    costPrice: 690000,
    barcode: null,
  },
  {
    name: "Gipsokarton 12.5 mm, 1.2×2.5 m",
    categoryId: "demo-c-drywall",
    unit: "SHEET",
    salePrice: 68000,
    costPrice: 59000,
    barcode: "4780000000059",
  },
  {
    name: "Profil CD-60, 3 m",
    categoryId: "demo-c-drywall",
    unit: "PIECE",
    salePrice: 24000,
    costPrice: 20000,
    barcode: "4780000000066",
  },
  {
    name: "Profil UD-27, 3 m",
    categoryId: "demo-c-drywall",
    unit: "PIECE",
    salePrice: 17000,
    costPrice: 14000,
    barcode: "4780000000073",
  },
  {
    name: "Emulsiya oq, 10 l",
    categoryId: "demo-c-paint",
    unit: "PIECE",
    salePrice: 165000,
    costPrice: 140000,
    barcode: "4780000000080",
  },
  {
    name: "Emal PF-115 jigarrang",
    categoryId: "demo-c-paint",
    unit: "LITER",
    salePrice: 42000,
    costPrice: 35000,
    barcode: "4780000000097",
  },
  {
    name: "Qum (yuvilgan)",
    categoryId: "demo-c-bulk",
    unit: "CUBIC_METER",
    salePrice: 180000,
    costPrice: 150000,
    barcode: null,
  },
  {
    name: "Shag'al 5–20 mm",
    categoryId: "demo-c-bulk",
    unit: "TON",
    salePrice: 210000,
    costPrice: 175000,
    barcode: null,
  },
];

async function main() {
  // Demo ma'lumotlar (parol: demo1234) hech qachon internetdagi bazaga yozilmasin
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
    console.error("Seed production'da o'chirilgan (demo parollar xavfli).");
    process.exit(1);
  }

  await prisma.tenant.upsert({
    where: { id: PLATFORM_TENANT_ID },
    update: {},
    create: { id: PLATFORM_TENANT_ID, name: "Platforma" },
  });
  const demoShop = {
    name: "Demo Qurilish Mollari",
    address: "Farg'ona sh., Qurilish bozori, 12-do'kon",
    phone: "+998 90 111 11 11",
  };
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: demoShop,
    create: { id: DEMO_TENANT_ID, ...demoShop },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of users) {
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: { name: u.name, role: u.role, tenantId: u.tenantId, passwordHash },
      create: { ...u, passwordHash },
    });
  }

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: { ...c, tenantId: DEMO_TENANT_ID },
    });
  }

  for (const [i, p] of products.entries()) {
    const id = `demo-p-${i + 1}`;
    await prisma.product.upsert({
      where: { id },
      update: p,
      create: { id, tenantId: DEMO_TENANT_ID, ...p },
    });
  }

  // Mijozlar va ustalar
  const customers = [
    {
      id: "demo-cu-1",
      name: "Usta Rustam (Quva)",
      phone: "+998915550001",
      isMaster: true,
      bonusPercent: "3",
    },
    {
      id: "demo-cu-2",
      name: "Usta Sherzod",
      phone: "+998915550002",
      isMaster: true,
      bonusPercent: "2.5",
    },
    {
      id: "demo-cu-3",
      name: "Abdulla aka (Marg'ilon)",
      phone: "+998915550003",
      creditLimit: 5_000_000,
    },
    { id: "demo-cu-4", name: "Dilnoza opa", phone: "+998915550004" },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: c,
      create: { tenantId: DEMO_TENANT_ID, ...c },
    });
  }

  // Minimal qoldiq (kam qolganda ogohlantirish) — bir nechta mahsulot uchun
  await prisma.product.updateMany({
    where: { id: { in: ["demo-p-1", "demo-p-2"] } },
    data: { minStock: "20" },
  });
  await prisma.product.update({ where: { id: "demo-p-8" }, data: { minStock: "1000" } });

  // Boshlang'ich qoldiq — faqat birinchi marta (qayta seed qilinganda qoldiq ikki baravar oshmasin)
  const hasStock = await prisma.stockDocument.count({ where: { tenantId: DEMO_TENANT_ID } });
  if (!hasStock) {
    const storekeeper = await prisma.user.findUniqueOrThrow({ where: { phone: "+998904444444" } });
    const initial: Record<string, string> = {
      "demo-p-1": "150", // Sement M400 (qop)
      "demo-p-2": "15", // Sement M500 — kam qoldi
      "demo-p-3": "40",
      "demo-p-4": "60",
      "demo-p-5": "800", // Armatura (metr)
      "demo-p-6": "2.5", // Armatura (tonna)
      "demo-p-7": "120",
      "demo-p-8": "5000", // G'isht (dona)
      "demo-p-9": "12.6",
      "demo-p-10": "80",
      "demo-p-11": "300",
      "demo-p-12": "250",
      "demo-p-13": "25",
      "demo-p-14": "40",
      "demo-p-15": "30",
      "demo-p-16": "45",
    };
    const { lastStockDocNumber } = await prisma.tenant.update({
      where: { id: DEMO_TENANT_ID },
      data: { lastStockDocNumber: { increment: 1 } },
    });
    const doc = await prisma.stockDocument.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        type: "RECEIPT",
        number: lastStockDocNumber,
        note: "Boshlang'ich qoldiq",
        createdById: storekeeper.id,
      },
    });
    for (const [i, p] of products.entries()) {
      const productId = `demo-p-${i + 1}`;
      const item = await prisma.stockDocumentItem.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          documentId: doc.id,
          productId,
          quantity: initial[productId],
          costPrice: p.costPrice,
        },
      });
      await prisma.stockMovement.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          productId,
          type: "RECEIPT",
          quantity: initial[productId],
          documentItemId: item.id,
          userId: storekeeper.id,
        },
      });
    }
  }

  console.log(
    `Seed tayyor: ${users.length} ta foydalanuvchi, ${categories.length} ta kategoriya, ${products.length} ta mahsulot`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
