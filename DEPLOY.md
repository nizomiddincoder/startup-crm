# Internetga chiqarish (Railway)

Bu qo'llanma dasturni Railway'ga joylash uchun. Hammasi terminalda (PowerShell) bajariladi.
Har bir buyruqni nusxa olib, Enter bosing. Taxminiy vaqt: 15–20 daqiqa.

Natijada Railway'da bitta **baza** (PostgreSQL) va bitta **servis** (`web`) bo'ladi.
Servis ishga tushganda o'zi:

1. bazaga yangi o'zgarishlarni (migratsiyalarni) qo'llaydi;
2. birinchi marta — platforma adminini yaratadi;
3. saytni va (token berilgan bo'lsa) Telegram botni yoqadi.

> Narx: Railway "Hobby" tarifi — oyiga taxminan 5$ dan (sayt + baza + bot uchun pilotga yetadi).

---

## 1. Railway akkaunt va kirish

1. https://railway.com saytida ro'yxatdan o'ting (GitHub yoki Google bilan) va "Hobby" tarifini yoqing.
2. Loyiha papkasida terminal oching va kiring (brauzer ochiladi, "Authorize" bosing):

```powershell
npx @railway/cli login
```

## 2. Loyiha va baza yaratish

```powershell
npx @railway/cli init --name kassa
```

```powershell
npx @railway/cli add --database postgres
```

## 3. Servis va sozlamalar

Avval maxfiy kalit yarating (natijani nusxa oling):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keyin servisni yarating. `<KALIT>` o'rniga yuqoridagi natijani, `<TELEFON>` va `<PAROL>` o'rniga
o'zingizning (platforma admini) telefon raqamingiz va kamida 8 belgili parolni yozing.
**Bitta tirnoq (') larni o'chirmang** — PowerShell `$` belgisini buzmasligi uchun kerak.

```powershell
npx @railway/cli add --service web --variables 'DATABASE_URL=${{Postgres.DATABASE_URL}}' --variables 'AUTH_SECRET=<KALIT>' --variables 'ADMIN_PHONE=<TELEFON>' --variables 'ADMIN_PASSWORD=<PAROL>' --variables 'ADMIN_NAME=Platforma admini'
```

## 4. Dasturni yuklash

```powershell
npx @railway/cli up --service web --detach
```

Yuklash va yig'ish (build) 3–6 daqiqa davom etadi. Holatni ko'rish:

```powershell
npx @railway/cli logs --service web
```

Loglarda `[start] Sayt ishga tushmoqda` va `[admin] Platforma admini yaratildi` chiqsa — tayyor.

## 5. Sayt manzili

```powershell
npx @railway/cli domain --service web
```

Chiqqan manzilni (`https://...up.railway.app`) brauzerda oching. Admin telefoni va paroli bilan
kiring — **Do'konlar** sahifasi ochiladi.

## 6. Birinchi do'konni qo'shish

1. **Do'konlar** → do'kon nomi, manzil, telefon, egasining ismi va telefoni → **Do'konni yaratish**.
2. Ekranda egasi uchun **login va parol** chiqadi — uni do'kon egasiga bering
   (boshqa ko'rsatilmaydi).
3. Do'kon egasi kirib: **Xodimlar** bo'limida kassir/omborchi qo'shadi,
   **Mahsulotlar**ni kiritadi, **Ombor → Kirim qilish** bilan boshlang'ich qoldiqni kiritadi.

Xavfsizlik uchun: admin yaratilgandan keyin `ADMIN_PASSWORD` o'zgaruvchisini Railway
saytidagi servis sozlamalaridan (**Variables**) o'chirib qo'yishingiz mumkin.

## 7. Telegram bot (ixtiyoriy)

1. Telegram'da **@BotFather** → `/newbot` → bot nomini kiriting (masalan, `kassa_demo_bot`).
2. BotFather bergan **token**ni nusxa oling.
3. Sozlamalarni qo'shing (servis o'zi qayta ishga tushadi):

```powershell
npx @railway/cli variable set --service web 'TELEGRAM_BOT_TOKEN=<TOKEN>' 'TELEGRAM_BOT_USERNAME=<BOT_NOMI>'
```

4. Saytda do'kon egasi: **Telegram bot** → **Ulash havolasini olish** → Telegram'da **Start**.
5. **Saytdan yangi ariza haqida xabar** olish uchun: Telegram'da @userinfobot'ga `/start` yozing —
   u sizning chat ID raqamingizni beradi. O'z botingizga ham bir marta `/start` yozing. Keyin:

```powershell
npx @railway/cli variable set --service web 'ADMIN_TELEGRAM_CHAT_ID=<CHAT_ID>'
```

Hisobot soati (sukut bo'yicha 20:00) va eslatma soati (10:00) Toshkent vaqti bilan:
`TELEGRAM_REPORT_HOUR`, `TELEGRAM_REMINDER_HOUR`.

## 8. O'z domeningizni ulash (masalan, kassa.uz)

Maqsad: `kassa.uz` ham, `www.kassa.uz` ham shu saytni ochsin.

1. Ikkala domenni Railway'ga qo'shing (har biri uchun alohida buyruq):

```powershell
npx @railway/cli domain kassa.uz --service web
```

```powershell
npx @railway/cli domain www.kassa.uz --service web
```

2. Har bir buyruq **DNS yozuvini** ko'rsatadi (turi `CNAME`, nomi va qiymati). Domenni sotib olgan
   saytingizda (masalan, ahost.uz, webname.uz) **DNS sozlamalari** bo'limiga kirib, Railway bergan
   yozuvlarni aynan shunday qo'shing:
   - `www` → `CNAME` → Railway bergan manzil;
   - asosiy domen (`@`) uchun — Railway ko'rsatgan yozuv (ba'zi provayderlarda `ALIAS`/`ANAME`;
     bunday tur bo'lmasa, provayderga "asosiy domenni CNAME'ga yo'naltirish kerak" deb yozing).
3. 5 daqiqadan 24 soatgacha kuting. Railway saytida **web → Settings → Networking**'da ikkala
   domen yonida yashil belgi chiqsa — tayyor (HTTPS sertifikati avtomatik beriladi).
4. Saytning asosiy manzilini yozing (Google, sitemap va Telegram havola rasmi shu manzil bilan
   ishlaydi). Qaysi birini asosiy qilsangiz — reklamalarda ham shuni ishlating:

```powershell
npx @railway/cli variable set --service web 'SITE_URL=https://kassa.uz'
```

5. Tekshirish: brauzerda `https://kassa.uz`, `https://www.kassa.uz`, `https://kassa.uz/robots.txt`,
   `https://kassa.uz/sitemap.xml` ochilsin. Telegram'da `https://kassa.uz` havolasini o'zingizga
   yuboring — rasm va sarlavha chiqishi kerak.

## 9. Reklama analitikasi va Telegram tugmasi

Bo'sh qoldirilsa — hech narsa yuklanmaydi (sayt tezroq). Qo'shilgach servis o'zi qayta yig'iladi
(3–6 daqiqa), so'ng saytda ishlaydi.

**Meta Pixel (Facebook/Instagram reklama):** business.facebook.com → **Events Manager** →
**Data sources** → Pixel'ingiz → **Settings** → **Pixel ID** (faqat raqamlar).

**Google Analytics 4:** analytics.google.com → **Admin** → **Data streams** → saytingiz →
**Measurement ID** (`G-` bilan boshlanadi).

**Telegram tugmasi:** sizning Telegram akkauntingiz yoki kanal havolasi (`https://t.me/...`).

```powershell
npx @railway/cli variable set --service web 'META_PIXEL_ID=<PIXEL_ID>' 'GA_MEASUREMENT_ID=<G-XXXX>' 'TELEGRAM_CONTACT_URL=https://t.me/<akkaunt>'
```

**Mahsulot rasmlari uchun AI (Google Gemini):** https://aistudio.google.com/apikey → **Create API key**.
Kalit bo'lmasa — rasmni qo'lda yuklash ishlaydi, AI tugmalari ko'rinmaydi. Bitta rasm ≈ $0.04;
har do'konga kunlik limit `GEMINI_DAILY_LIMIT` (sukut 30).

```powershell
npx @railway/cli variable set --service web 'GEMINI_API_KEY=<KALIT>'
```

Rasmlar bazada saqlanadi (Railway diski har yangilanishda tozalanadi) — Postgres zaxirasi
(Backups) rasmlarni ham saqlaydi. Shu kalit "Yordam" oynasidagi **AI yordamchini** ham yoqadi
(do'konga kuniga `ASSISTANT_DAILY_LIMIT` savol, sukut 100).

**Yangiliklar uchun Telegram kanal:** kanalingiz sozlamalarida **Administrators → Add admin** →
botingizni qo'shing ("Post messages" ruxsati). So'ng:

```powershell
npx @railway/cli variable set --service web 'TELEGRAM_NEWS_CHANNEL=@kanal_nomi'
```

Yangilik yozish: admin sifatida kiring → **Yangiliklar** → **Yangi yangilik** → **Saqlash** →
**Chop etish**. Bir bosishda: saytda (sahifa + tepadagi poster), dasturda (qo'ng'iroqcha), kanalda
va Telegram ulagan barcha do'kon egalariga xabar. Har biri bir marta yuboriladi.

Sayt yuboradigan hodisalar: har sahifada **PageView**; ariza yuborilganda **Lead** (GA4'da
`generate_lead`); ro'yxatdan o'tganda **CompleteRegistration** (GA4'da `sign_up`). Kassa va
kabinet sahifalari kuzatilmaydi. Tekshirish: Meta'da **Test events**, GA4'da **Realtime**.

## 10. Yangilanishni yuklash

**Hech narsa buzilmasligi uchun — yuklashdan oldin** (lokal kompyuterda, `npm run local` yoqilgan holda):

```powershell
npm run lint; npm run typecheck; npm test; npm run test:int; npm run build
```

Hammasi xatosiz o'tsa — yuklang (xuddi 4-qadam):

```powershell
npx @railway/cli up --service web --detach
```

Baza ma'lumotlari saqlanib qoladi, yangi migratsiyalar avtomatik qo'llanadi. Yig'ish (build) xato
bersa, eski versiya ishlashda davom etadi.

**Bir martalik sozlama (tavsiya):** Railway saytida **web → Settings → Deploy → Healthcheck Path**
ga `/api/health` yozing. Shunda Railway yangi versiya baza bilan to'liq ishlay boshlagandan
keyingina eskisini o'chiradi — foydalanuvchilar uchun uzilish bo'lmaydi.

**Orqaga qaytarish:** Railway saytida **web → Deployments** → oldingi ishlagan versiya → **⋮** →
**Redeploy**. (Migratsiya bazaga faqat yangi ustun/jadval qo'shadi — eski versiya ham ishlayveradi.)

## 11. Muhim eslatmalar

- **Zaxira nusxa (backup):** Railway saytida Postgres → **Backups** bo'limida kunlik zaxirani yoqing.
- **Demo ma'lumotlar** internetdagi bazaga yozilmaydi (`npm run db:seed` faqat lokal uchun).
- **Tekshirish manzili:** `https://<manzil>/api/health` — `{"ok":true}` qaytarsa, sayt va baza ishlayapti.
- **Login himoyasi:** bitta raqam bilan 15 daqiqada 5 marta noto'g'ri parol kiritilsa, vaqtincha bloklanadi.
