/**
 * AI yordamchining bilim bazasi: dasturdagi tugma va menyu nomlari (aynan ekrandagidek) va
 * qadam-baqadam yo'riqnomalar. Yangi imkoniyat qo'shilganda shu yerga ham yozing.
 */

export const ASSISTANT_GUIDE = `
DASTUR: shokolad savdo markazi uchun kassa, nasiya, smeta, ombor va hamkor bonusi tizimi. Til — o'zbek (lotin).

ROLLAR:
- Egasi: hamma bo'limlar (Panel, Kassa, Sotuvlar, Smenalar, Smetalar, Mijozlar, Mahsulotlar, Kategoriyalar, Ombor, Xodimlar, Telegram bot, Yangiliklar).
- Menejer: xodimlardan tashqari hammasi.
- Kassir: Kassa, Sotuvlar (qaytarish bilan), Smenalar, Smetalar, Mijozlar (qarz to'lovini qabul qilish), Yangiliklar. Panel va mahsulot narxlarini o'zgartira olmaydi.
- Omborchi: Panel, Mahsulotlar (ko'rish), Kategoriyalar, Ombor, Telegram bot, Yangiliklar. Kassaga kira olmaydi.

KASSA (menyu: Kassa):
- Mahsulot qo'shish: skaner bilan shtrix-kodni o'qitish yoki qidiruvga nomini yozib Enter; yoki chapdagi kartochkani bosish. "Ko'p sotiladigan" — oxirgi 30 kunda eng ko'p sotilganlar.
- Miqdor: savatchada − / + yoki raqamni yozish. Kasr (2,5 tonna) mumkin; dona, qop, pachka, list, rulon — faqat butun son.
- To'lov: pastdagi "To'lov (F2)" → bitta oyna: Mijoz, Hamkor, Chegirma, Naqd / Karta / O'tkazma / Nasiya summalari (aralash bo'ladi), "Hammasi" tugmalari. "Sotuvni yakunlash" (Enter). Qaytim o'zi hisoblanadi. Chek printerga o'zi chiqadi; ekranda "Sotuv № N yakunlandi" va "Chekni qayta chiqarish".
- Nasiyaga sotish: to'lov oynasida mijozni tanlang (yoki "Yangi mijoz"), Nasiya maydoniga summa, "To'lov muddati". Limitdan oshsa sotilmaydi.
- Navbatdagi mijoz: savatcha tepasidagi odamcha (+) tugmasi — yangi savatcha (Mijoz 2). To'langan mijoz yorlig'i yopiladi.
- "Savatchani tozalash" — qizil tugma.
- Klaviatura: Enter — qo'shish, F2 — to'lov, Esc — orqaga.
- Smeta: savatchani yig'ib "Smeta" → mijoz ismi, telefon, izoh, chegirma → "Smetani saqlash". Smetalar → smetani ochib "Chop etish" (A4) yoki "Kassaga yuklash" → to'lov.

QAYTARISH: Sotuvlar → chek raqamini bosing → "Tovarni qaytarish" → har qatorga qaytariladigan miqdor → pul qaytarish usuli (Naqd / Karta / O'tkazma / Nasiyasidan ayirish) → sabab → "Qaytarishni tasdiqlash". Tovar omborga qaytadi, hamkor bonusi ham mutanosib qaytadi.

SMENA: Smenalar → "Kassadagi naqd (ochilishda)" → "Smenani ochish". Kun oxirida kassadagi pulni sanab "Sanalgan naqd" → "Smenani yopish". Dastur "Bo'lishi kerak" summani hisoblaydi va kamomad/ortiqchani ko'rsatadi.

MIJOZLAR VA NASIYA: Mijozlar → "Mijoz qo'shish". Filtrlar: "Faqat qarzdorlar", "Faqat hamkorlar", "Faqat muddati o'tganlar". Mijoz kartasida: "Qarz to'lovini qabul qilish" (summa, usul). To'lov eng eski qarzni yopadi. "Telegram orqali tasdiqlash" → "QR-kodni ko'rsatish" → mijoz botda raqamini yuboradi va 4 xonali kodni aytadi → kodni kiritib "Tasdiqlash".
HAMKOR: mijoz kartasida "Bu mijoz hamkor" va "Bonus foizi (%)" (faqat egasi/menejer). Kassada to'lov oynasida Hamkor tanlanadi — bonus o'zi hisoblanadi, chekda ko'rinmaydi. Hamkor kartasida "Bonus berish" (naqd/karta/o'tkazma yoki qarzidan ayirish).

MARKETING (egasi/menejer): chap menyuda "Marketing". "Keshbek (%)" — kassada mijoz tanlansa, har xariddan shuncha foiz ball oladi (1 ball = 1 so'm); keyingi xaridda to'lov oynasidagi "Ball" maydoni bilan to'laydi. Ball bilan to'langan qism qaytarishda pul bo'lib qaytmaydi. "Aksiya qo'shish": nomi, chegirma %, mahsulotga yoki kategoriyaga, boshlanish va tugash sanasi — kassada narx o'zi kamayadi, kartochkada qizil "−10%" belgisi chiqadi. "O'chirish" tugmasi bilan to'xtatiladi. SHAXSIY CHEGIRMA: mijoz kartasida "Shaxsiy chegirma (%)" — kassada shu mijoz tanlansa chegirma o'zi qo'yiladi.

BUYURTMALAR (Telegram): mijoz botda /buyurtma → kategoriya → mahsulotni bosadi (+1) → "🧺 Savatcha" → "✅ Buyurtma berish". Egasi/menejerga Telegram xabari keladi, dasturda "Buyurtmalar" menyusida qizil raqam chiqadi. Buyurtmani oching → "Qabul qilish" → "Tayyor — mijozga xabar" → "Kassaga yuklash" (mijoz bilan yangi savatcha ochiladi) → odatdagidek to'lov. Bekor qilsangiz mijozga xabar boradi. Mijoz botda /buyurtmalarim (holati) va /xaridlarim (cheklar va ballar) ni ko'radi.

MAHSULOTLAR: Mahsulotlar → "Mahsulot qo'shish": nomi, kategoriya, o'lchov birligi, sotish narxi (125 000 kabi yozish mumkin), kelish narxi, shtrix-kod, minimal qoldiq → Saqlash. Keyin rasm: "Rasm yuklash" (telefon kamerasi ham) yoki "AI bilan rasm yaratish"; yuklangan rasmni "AI bilan chiroyli qilish". Eskisini o'chirmasdan "Arxivga olish".

OMBOR: Ombor → "Kirim qilish" (yetkazib beruvchi, miqdor, kelish narxi); "Hisobdan chiqarish" (singan tovar, sabab majburiy); "Inventarizatsiya" (sanalgan sonlar, dastur farqni topadi); "Faqat kam qolganlar" filtri; mahsulot nomini bosib — harakatlar tarixi.

PANEL: Bugungi tushum (sotuvlar − qaytarishlar), Jami nasiya, Muddati o'tgan, Kam qoldi. Kartochkani bosing — raqam qayerdan kelgani (ro'yxat) ochiladi.

XODIMLAR (faqat egasi): Xodimlar → "Xodim qo'shish" (ism, telefon, rol) — parol ekranda bir marta chiqadi. "Bloklash", "Yangi parol".

TELEGRAM BOT: botni oching → "📱 Telefon raqamni yuborish" — bot sizni raqamingizdan taniydi (kod kerak emas). Egasi/menejer kechqurun kunlik hisobot va ertalab nasiya xulosasini oladi. Buyruqlar: /hisobot, /qarzdorlar (do'kon); /buyurtma, /buyurtmalarim, /xaridlarim, /qarz (mijoz). Kirishni tasdiqlash: Telegram ulangan bo'lsa, har kirishda botda "✅ Tasdiqlash" bosiladi (Telegram bot sahifasida o'chirish mumkin).

KIRISH: telefon raqam + parol. Parol unutilsa — egasidan "Yangi parol" so'rang (egasi o'zi uchun — yordamga yozsin). 5 marta noto'g'ri parol — 15 daqiqa kutish.

CHEK PRINTERI: 80 mm termoprinter. Chek oynasiz chiqishi uchun dasturni ish stolidagi "Kassa" yorlig'i (Kassa.bat) orqali oching. Chek chiqmasa: printer yoqilgan va Windows'da sukut bo'yicha printer ekanini tekshiring, "Chekni qayta chiqarish" ni bosing.

INTERNET: dastur onlayn ishlaydi. Internet uzilsa — telefondan internet tarqating (mobil internet zaxira sifatida).

YORDAM: chap menyuda "Yordam" → "Muammo haqida xabar berish" — xabar do'kon, foydalanuvchi va sahifa bilan bizga boradi.
`;
