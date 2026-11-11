# Chocolate — shokolad savdo markazi uchun SaaS POS

## Maqsad

Shokolad sotuvchi savdo markazi uchun bulutli kassa, ombor, nasiya va hamkor bonusi tizimi.
(Sotuv sayti — `app/(marketing)`, `app/(campaign)` — olib tashlangan; "hamkor" = eski "usta" tushunchasi, kodda `isMaster`.)
Bir tizimda ko'p do'kon (multi-tenant). Pilot 2–3 haftada chiqishi kerak.

Loyiha egasi dasturchi emas: tushuntirishlar oddiy so'zlar bilan, o'zbek tilida bo'lsin.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (Base UI asosida)
- PostgreSQL + Prisma 6
- Auth.js (next-auth v5)
- Zod — tekshiruv
- Vitest — unit testlar, Playwright — e2e testlar
- Deploy: Railway

## Papkalar

```
app/
  (marketing)/   SOTUV SAYTI: "/", /narxlar, /jihozlar, /savollar, /aloqa, /register, /oferta, /maxfiylik
  (campaign)/    reklama qo'nish sahifalari (menyusiz): /pilot
  og/            OG rasm shabloni (faqat lokal, `npm run og`)
  (auth)/        login sahifasi
  (dashboard)/   do'kon egasi / menejer paneli
  pos/           kassir ekrani (sotuv, smeta)
  admin/         SaaS egasi paneli (do'konlar, obunalar)
  tokens.css     DESIGN TOKENS — barcha ranglar, shriftlar, radiuslar
  globals.css    Tailwind sozlamasi (tokenlarni klasslarga bog'laydi)
components/
  ui/            shadcn/ui umumiy komponentlari (biznesdan bexabar)
  features/      biznes komponentlari (modul bo'yicha papkalarda)
  marketing/     sotuv sayti komponentlari (dastur komponentlaridan alohida)
lib/
  services/      BARCHA biznes logikasi
  i18n/uz.ts     dastur interfeysidagi barcha matnlar
  i18n/marketing.uz.ts  sotuv saytidagi barcha matnlar
public/screens/  sotuv sayti skrinshotlari (hero.png va h.k.; yo'q bo'lsa — joy-belgi)
  db.ts          Prisma client
prisma/          schema.prisma, migratsiyalar, seed.ts
bot/             Telegram bot
e2e/             Playwright testlari
```

## Qoidalar (istisnosiz)

1. **Har so'rov `tenantId` bo'yicha filtrlanadi.** Har bir biznes jadvalida `tenantId` bor.
   Servis funksiyalari `tenantId`'ni sessiyadan oladi, foydalanuvchi kiritgan ma'lumotdan emas.
2. **Pul — so'mda, `Int`.** Kasr, tiyin, `Float` yo'q.
3. **Miqdor — `Decimal`** (metr, tonna, kg, m² bo'lishi mumkin). JS'da `number` bilan hisoblanmaydi.
4. **Ombor qoldig'i faqat `StockMovement` orqali o'zgaradi.** Qoldiqni to'g'ridan-to'g'ri
   tahrirlash taqiqlanadi; har kirim/chiqim/sotuv/qaytarish — alohida harakat yozuvi.
5. **Har forma va API Zod bilan tekshiriladi** (ham klientda, ham serverda).
6. **Biznes logikasi `lib/services`'da**, UI'dan alohida. Sahifalar va bot faqat servislarni chaqiradi.
7. **Interfeys o'zbekcha (lotin).** Barcha matnlar `lib/i18n/uz.ts`'da; komponentda matn yozilmaydi.
8. **Ranglar va shriftlar faqat design tokens orqali** (`app/tokens.css`). Komponentda
   `#hex`, `bg-blue-500` kabi qiymatlar yozilmaydi — faqat `bg-primary`, `text-muted-foreground` va h.k.
   Dizayn rasmlari kelganda faqat `tokens.css` almashtiriladi.
9. Har bir servis funksiyasiga Vitest testi yoziladi. Commitdan oldin: `npm run lint`,
   `npm run typecheck`, `npm test`.

## Dizayn (2026-10-25, referens bo'yicha)

- Uslub: och yashil-kulrang fon, oq kartochkalar (`rounded-2xl border bg-card shadow-card`),
  to'q yashil (teal) asosiy rang, shrift — Plus Jakarta Sans. Hammasi `app/tokens.css`'da.
- Qobiq: `components/features/layout/app-shell.tsx` — chapda ikonkali menyu (rolga qarab
  `navFor`), mobil'da tepada gorizontal. Sahifa sarlavhasi: `PageHeader` (sana + sarlavha + amallar).
- Kassa: chapda qidiruv/skaner + kategoriya chip'lari + mahsulot kartochkalari (`ProductGrid`),
  o'ngda "Buyurtma" paneli (qatorlar `−/+`, mijoz/usta, jami, to'lov usuli, katta yashil tugma).
- Mahsulot rasmlari yo'q — o'lchov birligiga mos ikonka (`UnitIcon`). Rasm yuklash — keyinroq.
- Tanlangan to'lov usuli tugmasi to'q (`bg-foreground`), qolganlari oq — referensdagidek.

## Login va rollar

- Login: telefon (+998XXXXXXXXX, butun tizimda yagona) + parol. Auth.js Credentials, JWT sessiya (12 soat).
- Rollar: `SUPER_ADMIN` (platforma), `OWNER`, `MANAGER`, `CASHIER`, `WAREHOUSE`.
- Qaysi rol qaysi bo'limga kirishi — faqat `lib/services/permissions.ts`'da (`SECTION_ACCESS`).
  Yangi bo'lim qo'shilsa, avval shu yerga yoziladi.
- Himoya ikki qavat: `middleware.ts` (auth.config.ts) + har bo'lim layout'ida `requireUser(roles)`.
- Server kodida joriy foydalanuvchi va `tenantId` faqat `requireUser()`'dan olinadi.
- Yagona istisno: login paytida foydalanuvchi telefon bo'yicha tenantsiz qidiriladi (`lib/services/auth.ts`).
- Demo foydalanuvchilar va sinov paroli: `prisma/seed.ts`.

## Mahsulotlar (P2)

- Modellar: `Category`, `Product`, o'lchov birligi — `Unit` enum (dona, metr, m², m³, kg, tonna,
  litr, qop, pachka, rulon, list). Yangi birlik: enum + `UNITS` (`lib/validation/product.ts`) + `uz.units`.
- Narx kiritishda "125 000" kabi yozuv qabul qilinadi (`parseSum`), bazada Int so'm.
- Shtrix-kod do'kon ichida yagona, boshqa do'konda takrorlanishi mumkin.
- Mahsulot o'chirilmaydi — arxivlanadi (`isActive`), chunki sotuvlarda ishlatiladi.
  Kategoriyani faqat bo'sh bo'lsa o'chirish mumkin.
- Kassa uchun tayyor: `findProductByBarcode(tenantId, barcode)` — faqat faol mahsulot.
- Ruxsat: ko'rish — panelga kiradigan rollar; o'zgartirish — `canManageProducts` (egasi, menejer).
- Biznes xatolari `ServiceError` (`lib/services/errors.ts`), formaga `toActionState` (`lib/actions/result.ts`).
- Ro'yxat bir martada 200 tagacha ko'rsatadi, qolganini qidiruv topadi.

## Kassa va smeta (P3)

- Hisob-kitob faqat `lib/services/sale-math.ts`'da (miqdor, qator summasi, chegirma, to'lov/qaytim).
  Savatcha (brauzer) va server AYNAN shu funksiyalarni ishlatadi.
- Kassadan serverga faqat `productId` + miqdor keladi. Narx serverda bazadan olinadi
  (smetadan sotilsa — smeta narxi). Brauzerdagi narxga hech qachon ishonilmaydi.
- Qator summasi = narx × miqdor, so'mgacha yaxlitlanadi (0.5 yuqoriga). Dona, qop, pachka, list,
  rulon — faqat butun son.
- To'lov: naqd / karta / o'tkazma, aralash bo'lishi mumkin. Qaytim faqat naqddan; karta + o'tkazma
  jami summadan oshmaydi. `SalePayment` yig'indisi har doim `Sale.total`ga teng.
- Sotuv bitta tranzaksiyada: chek raqami (`Tenant.lastSaleNumber` oshiriladi), qatorlar, to'lovlar va
  har qator uchun manfiy `StockMovement` (type SALE). Qoldiq yetmasa ham sotiladi (P4'da hal qilinadi).
- Smeta: narxlar tuzilgan paytda qotiriladi; "Kassaga yuklash" → sotuv → smeta CONVERTED.
  Bitta smeta bir marta sotiladi.
- Vaqt: O'zbekiston UTC+5 (`tashkentDayRange`, `lib/services/format.ts`).
- Chek 80 mm termoprinterga mos (`@page size: 80mm`), smeta A4.
- Kassa klaviaturasi: skaner/Enter — qo'shish, F2 — to'lov, Esc — orqaga. Savatcha brauzerda
  (`localStorage`, har foydalanuvchiga alohida) saqlanadi.
- Hali yo'q: sotuvni qaytarish/bekor qilish, mijozlar bazasi (P5), nasiya (P5).

## Ombor (P4)

- Qoldiq = `StockMovement.quantity` yig'indisi (`getBalances`, `lib/services/stock.ts`). Qoldiq ustuni YO'Q.
- Harakat turlari: SALE (−), RECEIPT (+), WRITE_OFF (−), ADJUSTMENT (±, inventarizatsiya).
- Ombor hujjati (`StockDocument`: RECEIPT / WRITE_OFF / INVENTORY) — har qatori bitta harakat yaratadi.
  Hujjat raqami `Tenant.lastStockDocNumber`. Inventarizatsiyada qatorga tizimdagi qoldiq (`expected`)
  yoziladi, farq 0 bo'lsa harakat yaratilmaydi.
- Kirimda kelish narxi berilsa — mahsulotning `costPrice` yangilanadi.
- Hisobdan chiqarishda sabab majburiy. Bitta hujjatda bir mahsulot bir marta.
- `Product.minStock` — "kam qoldi" belgisi. Minusdagi qoldiq ham "kam" hisoblanadi.
- Sotuv qoldiq yetmasa ham o'tadi (pilot qarori: do'konlar hali qoldiqni to'liq kiritmagan bo'ladi).
  Kassada ogohlantirish ko'rsatiladi. Keyin do'kon sozlamasi bilan taqiqlash mumkin.
- Ruxsat: `canManageStock` — egasi, menejer, omborchi. Omborchi kassaga kira olmaydi, shuning uchun
  ombor sahifalarida alohida qidiruv action'i (`searchStockProductsAction`).
- Hali yo'q: yetkazib beruvchilar bazasi, hujjatni bekor qilish (xato hujjat — teskari hujjat bilan).

## Nasiya va usta bonusi (P5)

- `Customer` — xaridor yoki usta (`isMaster`, `bonusPercent`). Telefon do'kon ichida yagona.
  Nasiya limiti `creditLimit` (null — limitsiz).
- Hisoblar `LedgerEntry` daftarida, qoldiq = `amount` yig'indisi (`getAccountBalances`), ustun YO'Q:
  - DEBT (mijoz do'konga qarzdor): SALE +, PAYMENT −
  - BONUS (do'kon ustaga qarzdor): ACCRUAL +, PAYOUT −
- Nasiya — to'lov usuli DEBT (`SalePayment`), mijoz majburiy, limit tekshiriladi, muddat ixtiyoriy.
  Qaytim faqat naqddan: karta + o'tkazma + nasiya ≤ jami.
- Usta bonusi = sotuv jami × foiz / 100 (`masterBonus`), sotuvda avtomatik hisoblanadi.
  Usta va bonus chekda KO'RSATILMAYDI.
- Bonus berish: naqd/karta/o'tkazma yoki "qarzidan ayirish" (BONUS PAYOUT + DEBT PAYMENT birga).
- Qarz to'lovi qarzdan, bonus berish bonus qoldig'idan oshmaydi. Mijoz qatori tranzaksiyada
  qulflanadi (`lockCustomer`) — parallel to'lovlar qoldiqdan oshib ketmaydi.
- Ruxsat: mijoz qo'shish va qarz to'lovini kassir ham qiladi; usta belgisi, bonus foizi, limit va
  bonus berish — faqat `canManageCustomers` (egasi, menejer). Sahifalar: `/pos/customers`.
- "Muddati o'tgan" hozircha oddiy belgi (yozuv muddati o'tgan va qarz bor). Eslatmalar — P6 (bot).

## Telegram bot (P6)

- Alohida jarayon: `npm run bot` (grammY, long polling). Kod: `bot/` (yupqa qatlam),
  mantiq: `lib/services/telegram/` (config, linking, reports, messages, dispatch).
- Muhit: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_REPORT_HOUR` (20),
  `TELEGRAM_REMINDER_HOUR` (10) — Toshkent vaqti.
- Xodim ulanishi: saytdagi `/dashboard/telegram` → bir martalik kod (15 daqiqa) →
  `t.me/<bot>?start=<kod>` → `User.telegramChatId`. Faqat egasi/menejer (`canReceiveReports`).
- Mijoz ulanishi: botga O'Z kontaktini yuboradi (`contact.user_id === from.id` tekshiriladi) →
  shu telefonli barcha do'kon mijozlariga `Customer.telegramChatId`. (Yagona tenant'siz qidiruv istisnosi.)
- Rejali xabarlar (`bot/scheduler.ts`, har daqiqa tekshiradi):
  - ertalab [REMINDER_HOUR, 18): egasi/menejerga nasiya xulosasi + mijozlarga eslatma;
  - kechqurun [REPORT_HOUR, 24): kunlik hisobot.
    Har do'konga kuniga bir marta — `TelegramDispatch` (tenantId, kind, day) unique qatori.
- Nasiya muddati FIFO bo'yicha (`lib/services/debt-schedule.ts`): to'lov eng eski qarzni yopadi.
  Mijozga eslatma: muddat ertaga/bugun — kuniga 1 marta; o'tgan — har 3 kunda; muddatsiz — yo'q.
- Buyruqlar: /start, /hisobot, /qarzdorlar (egasi/menejer), /qarz (mijoz), /help.
- Usta va bonus mijozga hech qachon yuborilmaydi.

## Deploy va boshqaruv (P7)

- Qo'llanma: `DEPLOY.md` (Railway CLI: `init`, `add --database postgres`, `add --service web`,
  `up`, `domain`). `railway.json` ishlatilmaydi (Railway'da eskirgan, 2026-12-01 dan o'qilmaydi).
- `npm start` = `scripts/start-prod.mjs`: `prisma migrate deploy` → (ADMIN_PHONE/ADMIN_PASSWORD
  bo'lsa) birinchi SUPER_ADMIN → `next start` + bot (TELEGRAM_BOT_TOKEN bo'lsa, yiqilsa qayta yoqiladi).
- `prisma` va `tsx` — `dependencies`'da (serverda kerak). Node >= 22.12.
- `AUTH_URL` QO'YILMAYDI: `trustHost: true` — domen so'rovdan olinadi.
- Admin panel (`/admin`, SUPER_ADMIN): do'kon + egasi yaratish (parol bir marta ko'rsatiladi),
  do'konni o'chirish/yoqish. Servis: `lib/services/admin.ts` (ataylab tenant'lar bo'ylab — istisno).
- Xodimlar (`/dashboard/staff`, faqat egasi): qo'shish (avtomatik parol), bloklash, yangi parol.
  Egasi o'zini va boshqa egani o'zgartira olmaydi.
- Login cheklovi: telefon bo'yicha 15 daqiqada 5 xato (`lib/services/rate-limit.ts`, xotirada —
  bitta server nusxasi uchun). `authenticateUser` ichida, shuning uchun `/api/auth/...` ham himoyalangan.
- Xavfsizlik sarlavhalari `next.config.ts`'da; `/api/health` — baza bilan tekshiruv.
- Demo seed production'da ishlamaydi (`ALLOW_DEMO_SEED=1` bo'lmasa).

## Sotuv sayti (S1)

- `app/(marketing)` — dasturdan alohida qobiq (`SiteHeader`, `SiteFooter`), chap menyu yo'q.
  Dastur kodi (`(auth)`, `(dashboard)`, `pos`, `admin`) bu bosqichda o'zgartirilmagan.
- Bosh sahifa bo'limlari (tartib bilan): header → hero → og'riqlar → imkoniyatlar → qanday ishlaydi →
  kim uchun → narxlar → kafolat → mijozlar fikri → savollar → ariza formasi (`#aloqa`) → footer.
- Matnlar FAQAT `lib/i18n/marketing.uz.ts`'da. `[Kvadrat qavsdagi]` qiymatlar — hali berilmagan
  (brend, narxlar, kassa soni, telefon, Telegram, manzil). Saytni chiqarishdan oldin to'ldirilsin.
- Mijozlar fikri: `marketing.testimonials.items` bo'sh bo'lsa bo'lim umuman chiqmaydi. Faqat haqiqiy
  fikr (rozilik bilan) qo'shiladi — soxta fikr YO'Q.
- Tizimga kirgan foydalanuvchi: header'da "Kirish"/"Bepul sinash" o'rniga "Kabinetga o'tish"
  (`homePathForRole`).
- `/register` — S4'dan boshlab o'zi ro'yxatdan o'tish (sinov do'koni darhol ochiladi), pastga qarang.
- Skrinshotlar: `ScreenSlot` — `public/screens/*.png` bo'lsa `next/image`, bo'lmasa yengil joy-belgi
  (imkoniyatlardagilari telefonda yashiriladi). Og'ir kutubxona yo'q, mobil menyu va FAQ — `<details>`.
- "Narxni ommaviy o'zgartirish" saytda e'lon qilingan, lekin dasturda HALI YO'Q — chiqarishdan oldin
  qilinishi yoki saytdan olinishi kerak.
- Huquqiy sahifalar — S3'da shablon matn bilan to'ldirildi (`/oferta`, `/maxfiylik`).
- Skrinshotlar: `docs/screenshots/landing-*.png` (`npx playwright screenshot --viewport-size "390,844" --full-page ...`).

## Saytdan arizalar (S2)

- `Lead` jadvali — ISTISNO: platformaga tegishli, `tenantId` yo'q; faqat SUPER_ADMIN ko'radi.
  Maydonlar: ism, telefon (+998...), shahar (FERGANA/ANDIJAN/NAMANGAN/OTHER), do'kon, `source`
  ("website" — bosh sahifa formasi, "self_signup" — /register), `utmSource/utmCampaign/keyword/ref`,
  `status` (NEW → CALLED → VISIT_SET → VISITED → PILOT → PAID, yoki LOST + `lostReason`), izoh, mas'ul.
- Qabul qilish: `submitLead` (`lib/services/leads/leads.ts`) — spam-tuzoq (`website` maydoni, odamga
  ko'rinmaydi) → IP bo'yicha cheklov (10 daqiqada 5) → Zod → bir telefon 24 soatda bitta ariza →
  baza → admin'ga Telegram. Spam/takror ham foydalanuvchiga "Rahmat" (/rahmat) ko'rsatadi.
- IP — `X-Forwarded-For`'ning OXIRGI qiymati (proksi qo'shadi; birinchisini mijoz soxtalashtira oladi).
- UTM/ref: `middleware.ts` (serverda, S4'dan) `?utm_source&utm_campaign&utm_term|keyword&ref`
  ni `lead_attr` cookie'ga 30 kun yozadi (oxirgi reklama ustun). Server cookie'ni Zod bilan o'qiydi.
- Telegram: mavjud bot tokeni + `ADMIN_TELEGRAM_CHAT_ID`. Xabar `after()` bilan javobdan keyin
  yuboriladi; Telegram ishlamasa ham ariza saqlanadi. Sozlanmagan bo'lsa — jim o'tadi.
- Admin: `/admin/leads` (filtr: holat, shahar; CSV — `/admin/leads/export`, BOM + formula himoyasi),
  `/admin/leads/[id]` (holat, sabab, izoh, mas'ul), `/admin` — voronka (hozir / bosqichga yetgan %)
  va manba bo'yicha (jami / to'lagan).
- Sessiya himoyasi (S2'da topilgan xato): `requireUser` har safar `isSessionActive` (xodim faol,
  do'kon faol) tekshiradi; yo'q bo'lsa → `/logout` (sessiyani o'chiradi) → /login.

## Sotuv sahifalari (S3)

- Narxlar FAQAT `lib/pricing.ts`'da (so'm, Int): 3 paket (standard, custom — "Ko'p tanlanadi",
  turnkey — "+ jihoz"), `annualFreeMonths` (yillik to'lovda 2 oy bepul), jihoz to'plamlari
  (`price: null` → "Narxni so'rang"), pilot (`seatsLeft` — qolgan o'rinlarni shu yerda kamaytiring).
  Paket nomlari va tarkibi (import/o'qitish/sozlash/yordam) — `marketing.uz.ts` → `pricing.plans`.
- Sahifalar: `/narxlar` (oylik/yillik almashtirgich), `/jihozlar` (to'plam → `?kit=` → forma,
  yashirin `message` "Jihoz: ..."), `/savollar` (10 ta, bosh sahifada birinchi 4 tasi), `/aloqa`
  (xarita: `contact.mapUrl` bo'sh bo'lsa joy-belgi), `/pilot` — `app/(campaign)`: reklama uchun,
  asosiy menyusiz, ariza `source="pilot"`.
- Huquqiy matnlar: `lib/i18n/legal.uz.ts` (`offer`, `privacy`) — SHABLON, yurist tekshirishi kerak
  (izoh faqat kodda). Ma'lumotlarni O'zbekistonda saqlash qonuni: Railway chet elda — yuristga savol.
- Rozilik: `CONSENT_REQUIRED_SOURCES` (hozir faqat `self_signup`) — Zod belgisiz o'tkazmaydi;
  `Lead.consentAt` — rozilik vaqti (admin kartochkasida ko'rinadi).
- `LeadForm` `onSubmit` + `startTransition` bilan yuboradi, `action=` EMAS: React 19 `action=`
  formani xatodan keyin ham tozalaydi (telefon va shahar o'chib ketardi).

## Saytni ishga tayyorlash (S4)

- **O'zi ro'yxatdan o'tish** (`/register`, `selfSignup` — `lib/services/leads/signup.ts`):
  spam-tuzoq → IP cheklovi → Zod (`signupSchema`: parol ≥ 8, rozilik majburiy) → telefon bandmi →
  tranzaksiya: Tenant (`trialEndsAt` = +30 kun) + OWNER + namunaviy katalog
  (`starter-catalog.ts`, 5 kategoriya / 8 mahsulot, shtrix-kodsiz) → Lead (self_signup) → Telegram →
  `signIn` → `/dashboard`. ISTISNO: tenant shu yerda yaratiladi. Admin ro'yxatida "Sinov: … gacha".
- **SEO**: `lib/seo.ts` → `pageMetadata(page, path)` (title, description, keywords, canonical, OG,
  twitter); matnlar `marketing.uz.ts → seo`. Layout'larda `%s — brend` shabloni (bosh sahifa —
  `absolute`). `app/sitemap.ts`, `app/robots.ts` (yopiq: `PRIVATE_PATHS`), LocalBusiness JSON-LD
  (`local-business-schema.tsx`, bosh sahifa va /aloqa; `[qavsdagi]` qiymatlar chiqarilmaydi).
  OG rasm: `public/og-image.png` (1200×630) — `npm run dev` + `npm run og` (`app/og` shablonidan).
- **Env** (`lib/site-config.ts`, bo'sh — o'chiq): `SITE_URL`, `TELEGRAM_CONTACT_URL`,
  `META_PIXEL_ID`, `GA_MEASUREMENT_ID`. Statik sahifalar ularni yig'ish paytida o'qiydi — Railway
  o'zgaruvchisi o'zgarsa servis qayta yig'iladi.
- **Analitika** (`components/marketing/analytics.tsx`, root layout): ID bo'lsagina yuklanadi.
  Server forma muvaffaqiyatidan keyin `kassa_evt` cookie'ga hodisa yozadi (`lib/analytics.ts`),
  brauzer keyingi sahifada yuboradi: Lead / generate_lead (ariza), CompleteRegistration / sign_up.
  Dastur sahifalarida (kabinet, kassa, login) PageView yo'q.
- Cookie xabari (`cookie-notice.tsx`, localStorage), "Telegramda yozish" tugmasi (`telegram-button.tsx`,
  sotuv sahifalari va 404). 404: `app/not-found.tsx`, 500: `app/error.tsx` + `global-error.tsx`
  (matnlar `uz.errorPages`).
- **Sessiya bekor qilish** (S4'da topilgan xato): fondagi prefetch so'rovlari "Chiqish"dan keyin
  eski cookie'ni qayta yozardi → chiqish ba'zan ishlamasdi. Endi JWT'da `sid` + `loginAt`;
  "Chiqish" `RevokedSession`ga yozadi (faqat shu qurilma), yangi parol — `User.sessionsValidFrom`
  (barcha qurilmalar). `requireUser` → `isSessionActive({userId, tenantId, loginAt, sid})`.
  Middleware `/logout`'ga tegmaydi; `/login`'dan yo'naltirish faqat GET'da.
- **Tezlik**: `npm run build` — webpack (Turbopack build JS'ni ~70 KB og'irlashtirib, Lighthouse 89
  edi). Brauzer komponentlari zod/uz.ts import qilmasin (`lead-constants.ts`, `phone-mask.ts`).
  Header'da backdrop-blur yo'q. Lighthouse mobil (2026-10-25): Performance 90–97, SEO 100,
  Accessibility 100 (7 sahifa).

## Kassa 2.0 (K1)

- **Ekran**: chapda ixcham kartochkalar (rasm/ikonka, nom, narx — qoldiq kartochkada YO'Q, faqat
  savatchada yetmasa ogohlantirish), birinchi tugma "Ko'p sotiladigan" (`topSellingProductsForPos`:
  oxirgi 30 kun, cheklar soni bo'yicha; `TOP_SELLERS = "__top"`). O'ngda navbat yorliqlari, savatcha
  (faqat u aylanadi), pastda jami + "Smeta" + "To'lov (F2)". Qizil "Savatchani tozalash".
- **Navbat**: `useCart` — bir nechta savatcha (`Mijoz 1, 2…`), localStorage'da; to'langan mijoz
  yorlig'i yopiladi (`finishActive`). Eski bitta savatcha formati avtomatik ko'chiriladi.
- **To'lov oynasi** (`PaymentDialog`): mijoz, usta, chegirma va 4 to'lov turi bitta oynada; summalarga
  tegilmasa naqd = jami. Sotuvdan keyin chek sahifasiga O'TILMAYDI: `/chek/[id]?print=1` yashirin
  iframe'da ochilib o'zi chop etadi; ekranda "Sotuv № N yakunlandi" + qayta chiqarish.
  Oynasiz chop etish — Chrome/Edge `--kiosk-printing` (Kassa.bat shunday ochadi, `local-db.mjs`).
  Shuning uchun `X-Frame-Options: SAMEORIGIN` (DENY emas).
- **Qaytarish** (`lib/services/returns.ts`, `/pos/sales/[id]/return`): chek qatori bo'yicha, qisman;
  summa = `returnLineAmount` (chegirmaga mutanosib). Ombor: `StockMovement` RETURN (+). Pul: naqd/karta/
  o'tkazma yoki nasiyadan ayirish (`LedgerEntry` DEBT RETURN −, FIFO'da to'lov kabi). Usta bonusi
  mutanosib qaytadi (BONUS RETURN −). Raqam — `Tenant.lastReturnNumber`.
- **Tushum** = sotuvlar − qaytarishlar (`buildDailyReport`: `revenue`, `returnsTotal`; `byMethod`dan
  qaytarilgan usul ayiriladi). `/pos/sales` shu hisobni ko'rsatadi.
- **Smena** (`lib/services/shifts.ts`, `/pos/shifts`): kassir ochadi (naqd bilan) va yopadi (sanalgan
  naqd). Kutilgan = ochilish + naqd sotuv + qarzdan naqd − naqd bonus − naqd qaytarish (shu kassir,
  smena vaqtida). Ixtiyoriy (sotuvni to'xtatmaydi); egasi/menejer barcha smenalarni ko'radi.
- **Panel**: kartochkalar bosiladi → `/pos/sales`, `/pos/customers?debtors=1`,
  `/pos/customers?overdue=1` (yangi filtr, FIFO bo'yicha muddati o'tgan), `/dashboard/warehouse?low=1`.
- Saytda ro'yxatdan o'tgan sinov do'konining namunaviy mahsulotlari qoldiqsiz — kassada "0" shu sabab.

## Telegram 2.0 va Yordam (K2)

- **Ulanish kodsiz**: odam botga O'Z raqamini yuboradi (`message:contact`, `user_id === from.id`).
  Tartib: 1) kassadagi mijoz tasdiqlashi (QR) → kod; 2) xodim (`linkStaffByPhone`, User.phone —
  har qanday rol); 3) mijoz (`linkCustomerByPhone`). Saytdagi "Ulash havolasini olish" olib tashlandi;
  `/dashboard/telegram` — holat, "Botni ochish", sozlamalar (panelga kiradigan barcha rollar).
- **Kirishni tasdiqlash** (`telegram/login-confirm.ts`, `User.telegramLoginConfirm`, sukut: yoqiq):
  bot tokeni bor + xodim ulangan bo'lsa — parol to'g'ri bo'lgach `LoginChallenge` va botga
  "✅/❌" (`outbox.sendLoginRequest`, callback `login:ok|no:<id>`). Forma har 2 soniyada holatni
  so'raydi; tasdiqlangach `completeLoginAction` → `signIn` (`challengeId` bilan). Tekshiruv
  `authenticateUser` ichida (`verifyPassword` + `consumeChallenge`, bir martalik) — /api/auth orqali
  aylanib o'tib bo'lmaydi. Telegramga yuborib bo'lmasa — kirish to'xtaydi (xavfsizlik). TTL 3 daqiqa.
  E2E/lokal: `.env`da bot tokeni bo'lmasa tasdiqlash o'chiq (demo loginlar ishlaydi).
- **Mijozni kassada tasdiqlash** (`telegram/customer-verify.ts`, mijoz kartasi): QR
  (`t.me/<bot>?start=v_<id>`, `qrcode` kutubxonasi) → mijoz botda raqamini yuboradi (mijoz telefoni
  bilan mos bo'lishi shart) → bot 4 xonali kod → kassir kiritadi (5 urinish, 10 daqiqa) →
  `Customer.telegramChatId` + `telegramVerifiedAt`. `TELEGRAM_BOT_USERNAME` kerak.
- **Yordam** (chap menyuda, barcha rollar; 500 sahifasida ham): aloqa (brend telefoni, Telegram) va
  "Muammo haqida xabar berish" → `SupportRequest` (do'kon, xodim, sahifa, xato kodi) + admin
  Telegramiga (`ADMIN_TELEGRAM_CHAT_ID`). Admin: `/admin/support` (hal qilindi / qayta ochish).

## Mahsulot rasmlari va Gemini (K3)

- Rasmlar BAZADA (`ProductImage`, bytea) — Railway diski yangilanishda tozalanadi, baza esa
  saqlanadi va zaxiralanadi. Alohida jadval: mahsulot so'rovlari og'irlashmaydi.
  `ORIGINAL` — yuklangan (WebP, ≤1280 px), `STANDARD` — kassada (oq fon, 512×512 kvadrat).
  `Product.imageVersion` (0 — rasm yo'q) — manzildagi `?v=`: kesh 1 yil, o'zgarsa yangi manzil.
- Ko'rsatish: `/media/products/[id]?v=..[&kind=original]` — faqat shu do'kon sessiyasi bilan.
  Kassada `ProductThumb` (rasm yoki birlik ikonkasi).
- Yuklash: mahsulot tahrirlash sahifasi (`ProductImageEditor`, telefon kamerasi ham), server action
  (`bodySizeLimit: 8mb`), `sharp` (`lib/services/images/process.ts`). Yangi mahsulot saqlangach —
  tahrirlash sahifasiga o'tiladi.
- Gemini (`lib/services/images/gemini.ts`, REST, `GEMINI_API_KEY`, model `GEMINI_IMAGE_MODEL`):
  rasm yo'q bo'lsa — nomi/kategoriyasi/birligidan yaratadi (yangi mahsulotda avtomatik, fonda);
  yuklangan rasmni bir xil uslubga keltiradi (asli saqlanadi). Bitta uslub (`STYLE` prompt): oq fon,
  markaz, matnsiz. Kunlik limit — `GEMINI_DAILY_LIMIT` (`AiGeneration` jadvali, xatolar ham yoziladi).
  Kalit bo'lmasa — AI tugmalari yo'q, qo'lda yuklash ishlaydi.
- `products/actions.ts` rasm servisini dinamik import qiladi: sharp (native) actions modulining
  yuklanishiga ta'sir qilmasin (dev'da "Cannot read properties of undefined (reading 'bind')" edi).

## Yangiliklar va AI yordamchi (K4)

- `NewsPost` (platforma darajasi, tenantId yo'q): sarlavha, matn, ixtiyoriy rasm (bazada), qayerda:
  `onSite`, `onApp`, `toChannel`, `toOwners`. Admin: `/admin/news` (qoralama → "Chop etish").
  `publishNews` — `publishedAt` bir marta; Telegram: kanal (`TELEGRAM_NEWS_CHANNEL`, bot admin) va
  barcha faol OWNER'larga (Telegram ulagan), har biri bir marta (`channelSentAt`, `ownersSentAt`),
  bloklagan egaga xato — qolganlari davom etadi. Rasm bo'lsa — rasm + izoh (`outbox.newsSender`).
- Sayt: `/yangiliklar`, `/yangiliklar/[id]` (OG bilan), tepada poster (oxirgi 14 kun, yopilsa —
  localStorage). Dastur: "Yangiliklar" (barcha rollar, `/news`), qizil raqam — `User.newsSeenAt`dan
  keyingilar (yangi xodimga — oxirgi 30 kun); sahifa ochilganda o'qilgan.
- Rasm route: `/media/news/[id]` (chop etilgan — hammaga; `?admin=1` — admin, qoralama ham).
- **AI yordamchi** (`lib/services/assistant.ts`, "Yordam" oynasining 1-yorlig'i, kalit bo'lsa):
  Gemini matn modeli (`GEMINI_TEXT_MODEL`), tizim ko'rsatmasi = rol + `lib/assistant/guide.uz.ts`
  (tugma nomlari aynan ekrandagidek; yangi imkoniyat qo'shilsa — shu yerga ham yozing). Do'kon
  ma'lumotlarini O'QIMAYDI. Oxirgi 12 xabar tarix sifatida. Limit: `ASSISTANT_DAILY_LIMIT`/do'kon/kun
  (`AiGeneration.kind = "assistant"`; rasm limiti alohida — `generate|standardize`).

## Mijozlar marketingi va Telegram buyurtmalari (K5)

- **Bonus ballari (keshbek)**: `Tenant.cashbackPercent` (null — o'chiq). Mijoz tanlangan sotuvda
  `percentOf(jami − ball, %)` (pastga yaxlitlash) → `LedgerEntry` POINTS EARN. Ball bilan to'lash —
  to'lov usuli `POINTS` (naqd emas: karta + o'tkazma + nasiya + ball ≤ jami), POINTS REDEEM;
  qoldiqdan oshmaydi (mijoz qatori qulflanadi). Qoldiq — `Balances.points` (ustun YO'Q).
  Qaytarish: ball bilan to'langan qism pul bo'lib QAYTMAYDI (`sale.total − pointsPaid`), yozilgan
  keshbek mutanosib qaytariladi (POINTS RETURN).
- **Shaxsiy chegirma**: `Customer.discountPercent` — kassada mijoz tanlanganda (chegirma bo'sh, smeta
  emas) chegirma summasi o'zi qo'yiladi (faqat brauzer; server oddiy chegirma sifatida tekshiradi).
- **Aksiyalar** (`Promotion`, `lib/services/promotions.ts`): % chegirma mahsulotga YOKI kategoriyaga,
  sanalar Toshkent kuni bo'yicha (boshi 00:00, oxiri 23:59:59). Mahsulot aksiyasi kategoriyanikidan
  ustun, bir nechtasi bo'lsa — eng kattasi. Narx `buildLines`'da (smeta narxi bo'lsa — aksiya YO'Q);
  kassa ro'yxatlari `withPromoPrices` (`salePrice` — aksiya narxi, `basePrice`, `promoPercent`).
- Sahifa: `/dashboard/marketing` (`canManageCustomers`): keshbek %, aksiya qo'shish, yoqish/o'chirish.
- **Buyurtmalar** (`Order`/`OrderItem`, `lib/services/orders.ts`, bot: `bot/orders.ts`):
  DRAFT (botdagi savatcha) → NEW (raqam `Tenant.lastOrderNumber`, narxlar qayta hisoblanadi,
  arxivlangan mahsulot tushib qoladi) → ACCEPTED → READY → DONE (kassada sotilganda, `orderId`,
  `saleId` unique) yoki CANCELLED. Bitta buyurtma bir marta sotiladi.
- Bot: `/buyurtma` (do'kon → kategoriya → mahsulot +1 → savatcha −/+ → yuborish), `/buyurtmalarim`,
  `/xaridlarim` (cheklar + ballar). Tugma ma'lumoti `o:<amal>:<mijozId>[:...]` ≤ 64 bayt; har tugmada
  `orderCustomer(chatId, mijozId)` — mijoz shu chat'niki ekani tekshiriladi (tenant'siz qidiruv istisnosi,
  chat bo'yicha). Yangi buyurtma — egasi/menejerlarga (Telegram ulagan) xabar.
- Dastur: `/pos/orders` (menyuda qizil raqam — NEW soni), `/pos/orders/[id]`: qabul / tayyor / bekor —
  mijozga Telegram (`outbox.sendTelegram`, ishlamasa ham holat saqlanadi); "Kassaga yuklash" →
  `/pos?order=id` — mijoz bilan savatcha (`CartState.order`), joriy (aksiya) narx bilan.

## Buyruqlar

- `npm run local` — **asosiy**: lokal baza + sayt birga (Docker kerak emas). Ctrl + C — to'xtatish
- `npm run db:local` — faqat lokal baza (embedded-postgres, ma'lumotlar `.local-db/`da).
  Birinchi marta o'zi bazani yaratadi, migratsiya va seed qiladi; keyin faqat yangi migratsiyalar.
  Bazani noldan boshlash: to'xtatib, `.local-db/` papkasini o'chirish
- `npm run dev` — faqat sayt (http://localhost:3000)
- `npm run build` va `npm start` — production (lokal sinash: `$env:PORT="3005"; npm start`)
- `npm run bot` — Telegram bot alohida (lokal)
- E2E boshqa serverda: `$env:E2E_BASE_URL="http://localhost:3005"; npx playwright test`
- `npm run db:up` / `npm run db:down` — Docker orqali PostgreSQL (Docker bor kompyuterlar uchun)
- `npm run db:migrate` — sxema o'zgarishini bazaga qo'llash
- `npm run db:seed` — sinov ma'lumotlari
- `npm run app` / `Kassa.bat` — ilova rejimi: baza + production sayt + Chrome/Edge alohida oynada
  `--kiosk-printing` bilan (chek oynasiz printerga). `DEMO_MODE=1` — login sahifasida demo tez kirish
- `npm run shortcut` — ish stolida "Kassa" yorlig'i
- `npm run og` — OG rasmini qayta yaratish (`public/og-image.png`; avval `npm run dev`)
- `npm run lint`, `npm run typecheck`, `npm run format`
- `npm test` — unit testlar (bazasiz)
- `npm run test:int` — integratsiya testlari (`*.int.test.ts`, haqiqiy bazada; avval `npm run db:local`).
  Har yangi servis uchun tenant ajratilganini tekshiruvchi integratsiya testi yoziladi
- `npm run test:e2e` — e2e testlar (Playwright; baza va sayt yoqilgan bo'lishi kerak).
  Testlar demo do'konda "E2E " bilan boshlanadigan yozuvlar yaratadi, oxirida o'zi tozalaydi

## Pilot rejasi

- **P1** — Baza + login + rollar (Tenant, User, Role: Egasi/Menejer/Kassir/Omborchi; Auth.js)
- **P2** — Mahsulotlar (kategoriya, o'lchov birligi, narx, shtrix-kod)
- **P3** — Kassa + smeta (sotuv, chek, smeta → sotuvga aylantirish)
- **P4** — Ombor (kirim, chiqim, inventarizatsiya — StockMovement)
- **P5** — Nasiya + usta bonusi (qarz daftari, to'lovlar; ustalarga sotuvdan bonus)
- **P6** — Telegram bot (hisobotlar, nasiya eslatmalari)
- **P7** — Deploy (Railway, prod baza, domen)

### Pilotdan keyin

- Oflayn rejim (internet uzilganda kassa ishlashi)
- Kengaytirilgan hisobotlar
- Avtomatik to'lov (obuna)

## Bajarilgan bosqichlar

- **P0 — Loyiha poydevori** (2026-10-24): Next.js 15, Tailwind v4 + shadcn/ui, Prisma
  (Tenant + User boshlang'ich sxema), ESLint/Prettier, Vitest/Playwright, docker-compose,
  i18n (`uz.ts`), design tokens, papkalar tuzilmasi.
- **P1 — Baza + login + rollar** (2026-10-24): Tenant/User sxemasi va birinchi migratsiya,
  demo seed, telefon+parol login (Auth.js), 5 ta rol va bo'limlar bo'yicha ruxsatlar,
  middleware himoyasi, chiqish, sarlavha (do'kon/foydalanuvchi/rol). Testlar: Vitest (ruxsatlar,
  login servisi, telefon validatsiyasi), Playwright (login oqimlari).
- **Lokal baza Docker'siz** (2026-10-24): egasining kompyuterida Docker yo'q (Windows 10 19042),
  shuning uchun `npm run local` / `npm run db:local` (embedded-postgres) qo'shildi.
  Baza majburan UTF-8 bilan yaratiladi (Windows rus tilida WIN1251 bo'lib qolardi).
- **P2 — Mahsulotlar** (2026-10-24): kategoriyalar (qo'shish, nomini o'zgartirish, o'chirish),
  mahsulotlar (ro'yxat, nomi/shtrix-kod bo'yicha qidiruv, kategoriya filtri, qo'shish, tahrirlash,
  arxiv), 11 ta o'lchov birligi, demo seed (6 kategoriya, 16 mahsulot), panel menyusi.
  Testlar: unit (validatsiya, narx), integratsiya (tenant ajratilishi, shtrix-kod), e2e (oqimlar, rollar).
- **P3 — Kassa + smeta** (2026-10-25): kassa ekrani (skaner, qidiruv, savatcha, chegirma,
  aralash to'lov, qaytim), 80 mm chek, bugungi sotuvlar, smeta (tuzish, A4 chop etish, kassaga
  yuklash, bekor qilish), sotuvda ombor harakati. Testlar: unit (hisob-kitob, format),
  integratsiya (tranzaksiya, chek raqamlari parallel, tenant, smeta), e2e (kassir va smeta oqimlari).
  E2E testlar demo do'konda haqiqiy sotuvlar qoldiradi — toza baza kerak bo'lsa `.local-db/`ni o'chiring.
- **P4 — Ombor** (2026-10-25): qoldiqlar (filtr, "kam qoldi", qiymat), kirim, hisobdan chiqarish,
  inventarizatsiya (kategoriyani to'liq yuklash), hujjatlar, mahsulot harakatlari tarixi, minimal
  qoldiq, kassada qoldiq ko'rsatish. Demo seed'ga boshlang'ich qoldiq. Testlar: integratsiya (qoldiq,
  inventarizatsiya, tenant), e2e (to'liq ombor oqimi, omborchi, kassa).
- **P5 — Nasiya + usta bonusi** (2026-10-25): mijozlar (ro'yxat, qarzdorlar/ustalar filtri,
  qo'shish, tahrirlash), kassada mijoz va usta tanlash (tezkor qo'shish), qisman/to'liq nasiya,
  muddat, limit, chekda mijoz va muddat; qarz to'lovi, bonus hisoblash va berish (qarzdan ayirish
  bilan), hisob tarixi. Demo seed: 2 usta, 2 mijoz. Testlar: unit (nasiya to'lovi, bonus),
  integratsiya (limit, ortiqcha to'lov, bonus, tenant), e2e (kassir nasiya oqimi, usta bonusi, ruxsatlar).
- **P6 — Telegram bot** (2026-10-25): xodim va mijoz ulanishi, kunlik hisobot, ertalabki nasiya
  xulosasi, mijozlarga nasiya eslatmasi (FIFO muddat hisobi), buyruqlar, saytda Telegram sahifasi.
  Testlar: unit (FIFO, eslatma qoidasi, xabar matnlari, bot ro'yxatdan o'tishi), integratsiya
  (ulanish kodlari, bir martalik yuborish, eslatma oralig'i, bloklangan bot), e2e (sahifa, ruxsat).
  Haqiqiy Telegram bilan tekshirish uchun egasi @BotFather'da bot yaratishi kerak.
- **Dizayn** (2026-10-25): referens uslubi — tokenlar, chap ikonkali menyu, kassa kartochkalari va
  buyurtma paneli, bosh sahifa ko'rsatkichlari, yangi login sahifasi.
- **P7 — Deploy tayyorligi** (2026-10-25): production ishga tushirish skripti, admin panel (do'kon
  yaratish), xodimlar sahifasi, login cheklovi, xavfsizlik sarlavhalari, health, `DEPLOY.md`.
  Production build lokal sinaldi (25/25 e2e). Railway'ga haqiqiy joylash — egasi `railway login`
  qilgandan keyin (akkaunt egasiniki).
- **S1 — Sotuv sayti** (2026-10-25): `app/(marketing)` — bosh sahifa (11 bo'lim), /narxlar,
  /register (ariza), huquqiy sahifalar, kirgan foydalanuvchi uchun "Kabinetga o'tish", mobil birinchi.
  Testlar: e2e (bo'limlar, forma, 390 px'da siljishsiz, kabinet tugmasi, sahifalar).
  Eski vaqtinchalik bosh sahifa (`app/page.tsx`) va uning testi olib tashlandi.
- **S2 — Saytdan arizalar** (2026-10-25): Lead jadvali, forma (+998 maska, shahar, Zod, spam-tuzoq,
  IP cheklovi), /rahmat, UTM/ref cookie (30 kun), admin'ga Telegram xabar, /admin/leads (filtr,
  tahrirlash, CSV), /admin voronka va manbalar. Tuzatish: bloklangan xodim / o'chirilgan do'kon
  sessiyasi endi darhol tugaydi. Testlar: unit (spam, cheklov, UTM, xabar, voronka, CSV),
  integratsiya (forma → baza → Telegram, takror, spam, admin), e2e (reklama havolasidan CSV'gacha).
- **S3 — Sotuv sahifalari** (2026-10-25): `lib/pricing.ts`, /narxlar (3 paket, yillik), /jihozlar,
  /savollar (10 ta), /pilot (alohida qo'nish sahifasi), /aloqa, /oferta va /maxfiylik (shablon),
  /register'da majburiy rozilik (`consentAt`). Tuzatish: xatodan keyin forma tozalanib ketmaydi.
  Testlar: unit (narxlar, rozilik), integratsiya (rozilik vaqti), e2e (har sahifa, jihoz buyurtmasi,
  rozilik). Skrinshotlar: `docs/screenshots/s3-*-mobile.png`.
- **S4 — Saytni ishga tayyorlash** (2026-10-25): SEO (har sahifa title/description, OG rasm,
  sitemap, robots, LocalBusiness), Meta Pixel + GA4 (env), cookie xabari, 404/500, Telegram tugmasi,
  o'zi ro'yxatdan o'tish → sinov kabineti, UTM serverda (middleware), DEPLOY.md (domen + www,
  analitika ID'lari, orqaga qaytarish). Tuzatishlar: "Chiqish" ba'zan ishlamasdi (sessiya
  bekor qilish), production'da UTM yo'qolardi, mobil tezlik 72 → 90+. Testlar: unit (signup,
  env sozlamalari), integratsiya (ro'yxatdan o'tish, sessiya bekor qilish), e2e (sayt → ro'yxat →
  kabinet → chiqish → kirish, 404, SEO, cookie) — production build'da 39/39 (ikki marta).
  Railway'ga haqiqiy joylash — egasi `railway login` qilgandan keyin.
- **K1 — Kassa 2.0** (2026-10-25): ixcham kassa, "Ko'p sotiladigan", navbat (bir nechta savatcha),
  bitta to'lov oynasi, chek oynasiz printerga, qaytarish (qisman, nasiyadan, usta bonusi bilan),
  kassa smenasi (kamomad/ortiqcha), panel raqamlari bosiladi, "muddati o'tgan" filtri. Testlar: unit
  (qaytarish summasi, bonus, smena), integratsiya (qaytarish, nasiya/bonus, hisobot, smena, filtr,
  ko'p sotiladigan, tenant), e2e (navbat, qaytarish + smena, panel, chek sahifasi) — 43/43.
- **K2 — Telegram 2.0 va Yordam** (2026-10-25): botga raqam orqali ulanish (barcha rollar, kodsiz),
  kirishni Telegramda tasdiqlash, mijozni kassada QR + kod bilan tasdiqlash, "Yordam" (aloqa +
  muammo xabari → admin), `/admin/support`. Ishga tushirish fayllari (Kassa.bat, demo tez kirish,
  ish stoli yorlig'i, kiosk-printing) ham shu commit'da. Testlar: integratsiya (raqam bo'yicha
  ulanish, tasdiqlash oqimi, bir martalik, rad/eskirgan, mijoz kodi, yordam), e2e 45/45.
- **K3 — Mahsulot rasmlari + Gemini** (2026-10-25): yuklash (kamera ham), kassa uchun oq fonli
  kvadrat, Gemini bilan yaratish va bir xil uslubga keltirish, kunlik limit, kassada rasm.
  Testlar: unit (Gemini so'rovi/javobi, prompt), integratsiya (yuklash, o'lcham, tur/hajm, tenant,
  AI soxta, limit, xato, o'chirish), e2e (rasm yuklash) + production build'da tekshirildi.
  Haqiqiy Gemini kaliti bilan hali sinalmagan (kalit egasidan).
- **K4 — Yangiliklar va AI yordamchi** (2026-10-25): bir marta yozib — sayt (sahifa + poster),
  dastur (qo'ng'iroqcha, barcha rollar), Telegram kanal va egalarga; AI yordamchi (Gemini, rolga
  mos, yo'riqnoma asosida). Testlar: integratsiya (chop etish, bir martalik yuborish, faqat egalar,
  bloklangan, o'qilmaganlar, rasm, yordamchi prompt/limit/xato), e2e (admin → sayt → poster →
  kassir) — 47/47. Haqiqiy kanal va Gemini kaliti bilan hali sinalmagan.
- **K5 — Mijozlar marketingi va buyurtmalar** (2026-10-25): bonus ballari (keshbek, "Ball" to'lovi),
  shaxsiy chegirma, aksiyalar (kassada chegirmali narx va belgi), Marketing sahifasi, botda buyurtma
  (katalog, savatcha, yuborish, holatlar, xaridlarim), Buyurtmalar sahifasi → kassaga yuklash.
  Testlar: unit 110 (ball, keshbek, aksiya narxi, tugma uzunligi), integratsiya 88 (ball/qaytarish,
  aksiya ustunligi, buyurtma oqimi, tenant ajratilishi), e2e 48/48. Haqiqiy bot bilan hali sinalmagan.
- **Keyingi bosqich (egasi tasdiqlagan)**: K6 — modullar/tariflar, sozlamalar, email.
  Telefon ilovasi (PWA) — keyinroq.
