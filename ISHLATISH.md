# Kassa — kompyuterda ishlatish

## Ishga tushirish

**Ish stolidagi «Kassa» tugmasini ikki marta bosing.**
(Yoki loyiha papkasidagi `Kassa.bat` faylini.)

1. Qora oyna ochiladi — bu dasturning o'zi, **uni yopmang**.
2. Birinchi marta 2–4 daqiqa kutasiz (baza tayyorlanadi, dastur yig'iladi).
   Keyingi safarlar — 10–20 soniya.
3. Brauzer o'zi ochiladi: **http://localhost:3000**

Ishni tugatganda **qora oynani yoping** — dastur to'xtaydi, kiritilgan ma'lumotlar saqlanadi.

> Ish stolida tugma yo'q bo'lsa: loyiha papkasida terminal oching va `npm run shortcut` yozing.
> Kompyuterda **Node.js** bo'lishi kerak (https://nodejs.org → LTS).

## Kirish

Login sahifasida **«Sinov uchun tez kirish»** tugmalari bor — bittasini bosing:

| Tugma | Kim | Nima ko'radi |
|---|---|---|
| **Egasi** | Do'kon egasi | Hamma narsa: panel, kassa, ombor, mijozlar, xodimlar, Telegram |
| **Menejer** | Menejer | Egasi kabi, faqat xodimlarni boshqarmaydi |
| **Kassir** | Kassir | Kassa, sotuvlar, smetalar, mijozlar |
| **Omborchi** | Omborchi | Mahsulotlar va ombor (kassa yo'q) |
| **Platforma admini** | Siz (SaaS egasi) | Do'konlar ro'yxati, yangi do'kon qo'shish |

Demo do'konda 16 ta qurilish mahsuloti, qoldiqlar, 2 usta va mijozlar tayyor.

## Nimani sinab ko'rish mumkin

1. **Kassir** → mahsulot kartochkasini bosing yoki nomini qidiring → `−/+` bilan miqdor →
   **To'lov (F2)** → naqd summa → chek chiqadi (**Chop etish** — chek printeri bo'lsa).
2. **Nasiya:** o'ng panelda **Mijoz** → ism yozib tanlang yoki yangisini qo'shing →
   to'lov usuli **Nasiya** → muddat → sotuv. Keyin **Mijozlar** bo'limida qarzni ko'ring va to'lov qabul qiling.
3. **Usta bonusi:** **Usta** maydonida «Rustam»ni tanlab soting → Mijozlar → Usta Rustam → bonus.
4. **Smeta:** savatchaga mahsulot qo'shing → **Smeta qilib saqlash** → chop eting → keyin
   **Kassaga yuklash** bilan soting.
5. **Omborchi** → Ombor → **Kirim qilish** / **Hisobdan chiqarish** / **Inventarizatsiya**.
6. **Egasi** → Bosh sahifa (bugungi tushum), **Xodimlar** (yangi kassir qo'shish — parol beriladi).

## Ma'lumotlar

- Hamma ma'lumot loyiha papkasidagi `.local-db` papkasida saqlanadi.
- **Hammasini boshidan boshlash** (demo holatiga qaytarish): dasturni yoping → `.local-db` papkasini
  o'chiring → «Kassa» tugmasini qayta bosing.

## Muammo bo'lsa

- **Brauzer ochilmadi** — qora oynada «Tayyor!» yozuvi chiqqandan keyin brauzerda
  `http://localhost:3000` manzilini o'zingiz oching.
- **«Dastur allaqachon ishlayapti»** — dastur boshqa oynada ochiq; brauzer shunchaki ochiladi.
- **Qizil xato yozuvlari** — qora oynadagi matnni nusxa olib, menga yuboring.

Internetga (Railway) chiqarish — `DEPLOY.md`.
