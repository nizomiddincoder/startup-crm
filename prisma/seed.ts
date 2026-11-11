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
  { id: "demo-c-dark", name: "Qora shokolad" },
  { id: "demo-c-milk", name: "Sut shokoladi" },
  { id: "demo-c-white", name: "Oq shokolad" },
  { id: "demo-c-candy", name: "Konfetlar" },
  { id: "demo-c-gift", name: "Sovg'a to'plamlari" },
  { id: "demo-c-pack", name: "Vafli va qadoqlash" },
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
    name: "Qora shokolad 70%, 100 g",
    categoryId: "demo-c-dark",
    unit: "PIECE",
    salePrice: 14000,
    costPrice: 11000,
    barcode: "4780000000011",
  },
  {
    name: "Qora shokolad 85%, 100 g",
    categoryId: "demo-c-dark",
    unit: "PIECE",
    salePrice: 16000,
    costPrice: 12500,
    barcode: "4780000000028",
  },
  {
    name: "Qora shokolad 70%, karton (24 dona)",
    categoryId: "demo-c-dark",
    unit: "BOX",
    salePrice: 320000,
    costPrice: 262000,
    barcode: "4780000000035",
  },
  {
    name: "Sut shokoladi Alpen Gold, 90 g",
    categoryId: "demo-c-milk",
    unit: "PIECE",
    salePrice: 12000,
    costPrice: 9500,
    barcode: "4780000000042",
  },
  {
    name: "Sut shokoladi karamel, 100 g",
    categoryId: "demo-c-milk",
    unit: "PIECE",
    salePrice: 13000,
    costPrice: 10000,
    barcode: "4780000000059",
  },
  {
    name: "Sut shokoladi, karton (30 dona)",
    categoryId: "demo-c-milk",
    unit: "BOX",
    salePrice: 330000,
    costPrice: 270000,
    barcode: "4780000000066",
  },
  {
    name: "Oq shokolad, 100 g",
    categoryId: "demo-c-white",
    unit: "PIECE",
    salePrice: 13500,
    costPrice: 10500,
    barcode: "4780000000073",
  },
  {
    name: "Oq shokolad (ulgurji)",
    categoryId: "demo-c-white",
    unit: "KG",
    salePrice: 115000,
    costPrice: 95000,
    barcode: null,
  },
  {
    name: "Shokoladli konfet assorti",
    categoryId: "demo-c-candy",
    unit: "KG",
    salePrice: 95000,
    costPrice: 78000,
    barcode: null,
  },
  {
    name: "Pralinalar qutisi, 200 g",
    categoryId: "demo-c-candy",
    unit: "PIECE",
    salePrice: 42000,
    costPrice: 33000,
    barcode: "4780000000080",
  },
  {
    name: "Yong'oqli konfet (ulgurji)",
    categoryId: "demo-c-candy",
    unit: "KG",
    salePrice: 105000,
    costPrice: 88000,
    barcode: null,
  },
  {
    name: "Sovg'a to'plami «Bayram», 500 g",
    categoryId: "demo-c-gift",
    unit: "PIECE",
    salePrice: 98000,
    costPrice: 80000,
    barcode: "4780000000097",
  },
  {
    name: "Sovg'a to'plami «Premium», 1 kg",
    categoryId: "demo-c-gift",
    unit: "PIECE",
    salePrice: 185000,
    costPrice: 150000,
    barcode: "4780000000103",
  },
  {
    name: "Shokoladli vafli, 40 g",
    categoryId: "demo-c-pack",
    unit: "PIECE",
    salePrice: 3000,
    costPrice: 2300,
    barcode: "4780000000110",
  },
  {
    name: "Vafli pachka (10 dona)",
    categoryId: "demo-c-pack",
    unit: "PACK",
    salePrice: 28000,
    costPrice: 22000,
    barcode: null,
  },
  {
    name: "Qadoqlash lentasi (rulon)",
    categoryId: "demo-c-pack",
    unit: "ROLL",
    salePrice: 15000,
    costPrice: 11000,
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
    name: "Chocolate savdo markazi (demo)",
    address: "Farg'ona sh., savdo markazi, 1-do'kon",
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

  // Shtrix-kodlar do'kon ichida yagona: eski seed'dan qolgan kodlar yangi mahsulotlarga
  // o'tib qolmasligi uchun avval bo'shatiladi (qayta seed qilish xavfsiz bo'lsin)
  await prisma.product.updateMany({
    where: { tenantId: DEMO_TENANT_ID },
    data: { barcode: null },
  });
  for (const [i, p] of products.entries()) {
    const id = `demo-p-${i + 1}`;
    await prisma.product.upsert({
      where: { id },
      update: p,
      create: { id, tenantId: DEMO_TENANT_ID, ...p },
    });
  }

  // Mijozlar: hamkorlar (kiosk egalari, bonus oladi) va oddiy xaridorlar
  const customers = [
    {
      id: "demo-cu-1",
      name: "Hamkor Rustam (Chilonzor do'koni)",
      phone: "+998915550001",
      isMaster: true,
      bonusPercent: "3",
    },
    {
      id: "demo-cu-2",
      name: "Hamkor Sherzod (Oqtepa kafesi)",
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

  // Minimal qoldiq (kam qolganda ogohlantirish)
  await prisma.product.updateMany({
    where: { id: { in: ["demo-p-1", "demo-p-2", "demo-p-14"] } },
    data: { minStock: "20" },
  });
  await prisma.product.update({ where: { id: "demo-p-14" }, data: { minStock: "50" } });

  // Boshlang'ich qoldiq — faqat birinchi marta (qayta seed qilinganda qoldiq ikki baravar oshmasin)
  const hasStock = await prisma.stockDocument.count({ where: { tenantId: DEMO_TENANT_ID } });
  if (!hasStock) {
    const storekeeper = await prisma.user.findUniqueOrThrow({ where: { phone: "+998904444444" } });
    const initial: Record<string, string> = {
      "demo-p-1": "150", // Qora 70% (dona)
      "demo-p-2": "15", // Qora 85% — kam qoldi
      "demo-p-3": "12", // Qora karton
      "demo-p-4": "60", // Alpen Gold (dona)
      "demo-p-5": "40", // Karamel (dona)
      "demo-p-6": "8", // Sut karton
      "demo-p-7": "80", // Oq shokolad (dona)
      "demo-p-8": "250", // Oq ulgurji (kg)
      "demo-p-9": "120", // Konfet assorti (kg)
      "demo-p-10": "25", // Pralinalar (dona)
      "demo-p-11": "60", // Yong'oqli konfet (kg)
      "demo-p-12": "40", // Bayram to'plami (dona)
      "demo-p-13": "15", // Premium to'plam (dona)
      "demo-p-14": "500", // Vafli (dona)
      "demo-p-15": "60", // Vafli pachka
      "demo-p-16": "30", // Lenta (rulon)
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
