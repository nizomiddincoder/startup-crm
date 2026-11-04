/**
 * ⚠️ YURIST TOMONIDAN TEKSHIRILISHI KERAK. ⚠️
 * Bu — shablon matn (dasturchi tayyorlagan), yuridik maslahat emas. Saytga chiqarishdan oldin
 * O'zbekiston qonunchiligini biladigan yurist tekshirib, [kvadrat qavsdagi] joylarni to'ldirishi shart.
 *
 * Alohida e'tibor: "Shaxsga doir ma'lumotlar to'g'risida"gi Qonun O'zbekiston fuqarolarining
 * shaxsiy ma'lumotlarini O'zbekiston hududidagi serverlarda saqlashni talab qiladi.
 * Hozirgi rejadagi hosting (Railway) — xorijda. Bu masalani yurist bilan hal qiling.
 *
 * (Bu izoh faqat kodda — saytda ko'rinmaydi.)
 */

export type LegalDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
};

const company = "[Kompaniya nomi]";

export const offer: LegalDoc = {
  title: "Ommaviy oferta",
  updated: "[sana]",
  intro: `Ushbu hujjat ${company} (keyingi o'rinlarda — «Ijrochi») tomonidan savdo tizimidan (keyingi o'rinlarda — «Tizim») foydalanish xizmatlarini ko'rsatish bo'yicha ommaviy taklif (oferta) hisoblanadi. O'zbekiston Respublikasi Fuqarolik kodeksiga muvofiq, quyida belgilangan harakatlarni bajargan shaxs (keyingi o'rinlarda — «Mijoz») ushbu shartlarni to'liq qabul qilgan hisoblanadi.`,
  sections: [
    {
      heading: "1. Atamalar",
      paragraphs: [
        "Tizim — Ijrochiga tegishli, internet orqali ishlaydigan savdo, ombor, nasiya va hisobot dasturi.",
        "Ulanish — Tizimni Mijoz do'koni uchun sozlash, ma'lumotlarni kiritish va xodimlarni o'qitish xizmati.",
        "Obuna — Tizimdan belgilangan muddat (oy yoki yil) davomida foydalanish huquqi.",
      ],
    },
    {
      heading: "2. Ofertani qabul qilish (aksept)",
      paragraphs: [
        "Mijoz saytdagi ro'yxatdan o'tish formasida «Oferta va maxfiylik siyosatiga roziman» belgisini qo'yib ariza yuborganda yoki xizmat uchun birinchi to'lovni amalga oshirganda oferta qabul qilingan hisoblanadi.",
      ],
    },
    {
      heading: "3. Xizmatlar va narxlar",
      paragraphs: [
        "Xizmatlar tarkibi va narxlari saytning «Narxlar» sahifasida e'lon qilinadi. Ulanish narxi bir marta, obuna — har oy yoki har yil oldindan to'lanadi.",
        "Ijrochi narxlarni o'zgartirish huquqiga ega; yangi narx Mijozning keyingi to'lov davridan boshlab qo'llaniladi va kamida [30] kun oldin xabar qilinadi.",
      ],
    },
    {
      heading: "4. To'lov tartibi",
      paragraphs: [
        "To'lov [bank o'tkazmasi / boshqa usullar] orqali amalga oshiriladi. To'lov amalga oshirilmasa, Ijrochi [N] kun ogohlantirgandan so'ng Tizimga kirishni vaqtincha to'xtatishi mumkin. Mijoz ma'lumotlari bu davrda o'chirilmaydi.",
      ],
    },
    {
      heading: "5. Kafolat va pulni qaytarish",
      paragraphs: [
        "Agar Mijoz birinchi obuna to'lovidan keyingi 30 kalendar kun ichida Tizimdan voz kechsa, obuna uchun to'langan summa to'liq qaytariladi. [Ulanish va jihoz narxi qaytarilishi shartlari — yurist bilan aniqlashtiring.]",
      ],
    },
    {
      heading: "6. Tomonlarning majburiyatlari",
      paragraphs: [
        "Ijrochi: Tizimning uzluksiz ishlashini ta'minlashga harakat qiladi, Mijoz ma'lumotlarini boshqa shaxslarga bermaydi, ish vaqtida texnik yordam ko'rsatadi.",
        "Mijoz: Tizimga kirish parollarini maxfiy saqlaydi, Tizimga kiritilgan ma'lumotlarning to'g'riligi uchun javob beradi, o'z xodimlari va xaridorlarining shaxsiy ma'lumotlarini qonunga muvofiq kiritadi.",
      ],
    },
    {
      heading: "7. Javobgarlik",
      paragraphs: [
        "Ijrochi internet ulanishidagi uzilishlar, Mijoz jihozlaridagi nosozliklar yoki uchinchi shaxslarning harakatlari natijasida yuzaga kelgan zararlar uchun javobgar emas. Ijrochining javobgarligi Mijoz oxirgi [3] oyda to'lagan obuna summasi bilan cheklanadi.",
      ],
    },
    {
      heading: "8. Shartnoma muddati va bekor qilish",
      paragraphs: [
        "Shartnoma ofertani qabul qilgan kundan kuchga kiradi va to'langan obuna muddati davomida amal qiladi. Har bir tomon [30] kun oldin yozma (shu jumladan elektron) xabar berib shartnomani bekor qilishi mumkin. Bekor qilinganda Mijoz so'roviga ko'ra uning ma'lumotlari [elektron jadval] ko'rinishida beriladi.",
      ],
    },
    {
      heading: "9. Nizolarni hal qilish",
      paragraphs: [
        "Nizolar muzokaralar yo'li bilan, kelishuvga erishilmasa — O'zbekiston Respublikasi qonunchiligiga muvofiq [sud nomi]da hal qilinadi.",
      ],
    },
    {
      heading: "10. Ijrochi rekvizitlari",
      paragraphs: [
        `${company}, STIR: [STIR], manzil: [yuridik manzil], bank: [bank nomi], h/r: [hisob raqam], MFO: [MFO], telefon: [telefon], e-pochta: [e-pochta].`,
      ],
    },
  ],
};

export const privacy: LegalDoc = {
  title: "Shaxsiy ma'lumotlar siyosati",
  updated: "[sana]",
  intro: `Ushbu siyosat ${company} (keyingi o'rinlarda — «Operator») sayt va savdo tizimi orqali olinadigan shaxsiy ma'lumotlarni qanday yig'ishi, saqlashi va himoya qilishini belgilaydi. Siyosat O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuniga muvofiq tuzilgan.`,
  sections: [
    {
      heading: "1. Qanday ma'lumotlar yig'iladi",
      paragraphs: [
        "Saytdagi formalar orqali: ism, telefon raqami, shahar, do'kon nomi, reklama manbasi (masalan, qaysi e'londan kelganingiz).",
        "Tizimdan foydalanishda: do'kon xodimlarining ismi va telefoni (login uchun), xaridorlar va ustalarning ismi, telefoni, nasiya va to'lovlar tarixi — Mijoz tomonidan kiritiladi.",
        "Texnik ma'lumotlar: IP-manzil (spamdan himoya uchun), cookie fayllari (kirish sessiyasi va reklama manbasini 30 kun eslab qolish uchun), sayt tashriflari statistikasi (Meta Pixel va Google Analytics — ular yoqilgan bo'lsa).",
      ],
    },
    {
      heading: "2. Maqsadlar",
      paragraphs: [
        "Ariza bo'yicha siz bilan bog'lanish; Tizim xizmatlarini ko'rsatish; nasiya eslatmalari va hisobotlarni Telegram orqali yuborish; xavfsizlikni ta'minlash; reklama samaradorligini baholash.",
      ],
    },
    {
      heading: "3. Rozilik",
      paragraphs: [
        "Formani yuborish va «roziman» belgisini qo'yish orqali siz ma'lumotlaringizni ushbu siyosatga muvofiq qayta ishlashga rozilik berasiz. Roziligingizni istalgan vaqtda [e-pochta/telefon] orqali qaytarib olishingiz mumkin.",
      ],
    },
    {
      heading: "4. Saqlash joyi va muddati",
      paragraphs: [
        "Ma'lumotlar [server joylashuvi — qonun talabiga muvofiq aniqlashtiring] serverlarida saqlanadi. Arizalar [muddat] davomida, Tizim ma'lumotlari — shartnoma amal qilgan davr va undan keyin qonunda belgilangan muddat davomida saqlanadi.",
      ],
    },
    {
      heading: "5. Uchinchi shaxslarga berish",
      paragraphs: [
        "Ma'lumotlar sotilmaydi va reklama maqsadida berilmaydi. Faqat xizmat ko'rsatish uchun zarur hamkorlarga (hosting, Telegram orqali xabar yuborish, sayt statistikasi — Meta va Google) va qonunda belgilangan hollarda vakolatli organlarga beriladi.",
      ],
    },
    {
      heading: "6. Himoya choralari",
      paragraphs: [
        "Har bir do'kon ma'lumoti alohida saqlanadi; parollar shifrlangan (hash) ko'rinishda saqlanadi; xodimlar faqat o'z vakolatidagi bo'limlarni ko'radi; noto'g'ri parol urinishlari cheklanadi.",
      ],
    },
    {
      heading: "7. Sizning huquqlaringiz",
      paragraphs: [
        "Siz o'zingiz haqingizdagi ma'lumotlarni bilish, ularni tuzatish yoki o'chirishni talab qilish huquqiga egasiz. Murojaat uchun: [e-pochta], [telefon].",
      ],
    },
    {
      heading: "8. O'zgartirishlar",
      paragraphs: [
        "Operator ushbu siyosatni o'zgartirishi mumkin; yangi tahrir saytda e'lon qilingan kundan kuchga kiradi.",
      ],
    },
  ],
};
