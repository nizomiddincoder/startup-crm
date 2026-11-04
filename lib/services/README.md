# lib/services

Barcha biznes logikasi shu yerda (UI'dan alohida). Sahifalar, server action'lar,
API route'lar va Telegram bot faqat shu funksiyalarni chaqiradi.

Qoidalar:

- Har bir funksiya birinchi argument sifatida `tenantId` oladi va har so'rovni u bo'yicha filtrlaydi.
- Kirish ma'lumotlari Zod sxemasi bilan tekshiriladi.
- Ombor qoldig'i faqat `StockMovement` yozuvi orqali o'zgaradi.
- Har bir servisga `*.test.ts` (Vitest) yoziladi.
