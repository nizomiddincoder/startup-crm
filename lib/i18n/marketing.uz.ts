/**
 * Sotuv sayti (landing) matnlari — o'zbek tili, lotin yozuvi.
 * Dastur matnlari alohida: lib/i18n/uz.ts.
 *
 * [Kvadrat qavsdagi] qiymatlar — hali berilmagan ma'lumot. Saytni chiqarishdan oldin to'ldiring:
 * brend nomi, narxlar, telefon, Telegram, manzil. Ular faqat shu faylda.
 */

export type Testimonial = {
  name: string;
  /** Do'kon nomi va shahar */
  shop: string;
  text: string;
};

export const marketing = {
  brand: "[Brend]",

  meta: {
    title: "Qurilish mollari do'konlari uchun savdo tizimi",
    description:
      "Nasiya, smeta, usta bonusi va ombor — bitta tizimda. Do'koningizni Telegramdan boshqaring. 30 kun bepul.",
  },

  nav: {
    features: "Imkoniyatlar",
    pricing: "Narxlar",
    equipment: "Jihozlar",
    faq: "Savollar",
    contact: "Aloqa",
    news: "Yangiliklar",
    pilot: "Pilot dasturi",
    login: "Kirish",
    trial: "Bepul sinash",
    cabinet: "Kabinetga o'tish",
    menu: "Menyu",
  },

  hero: {
    title: "Nasiyani yo'qotmang. Smetani 1 daqiqada chiqaring.",
    subtitle:
      "Qurilish mollari do'konlari uchun savdo tizimi. Kompyuterni bilishingiz shart emas — do'koningizni Telegramdan boshqarasiz.",
    primary: "30 kun bepul sinash",
    secondary: "Ko'rsatib berishimizni so'rang",
    screenAlt: "Dastur oynasi: kassa va buyurtma paneli",
  },

  pains: {
    title: "Tanish holatmi?",
    items: [
      {
        icon: "notebook",
        title: "Nasiya daftarda",
        text: "Daftar yo'qoladi, yozuv o'chadi, kim qancha qarzligi esdan chiqadi. Pul qaytmaydi.",
      },
      {
        icon: "clock",
        title: "Smetaga yarim soat",
        text: "Mijoz kutadi, kalkulyatorda xato chiqadi, narx eskirgan bo'ladi.",
      },
      {
        icon: "handshake",
        title: "Usta bonusi bo'yicha janjal",
        text: "Qaysi usta qancha mijoz olib kelgani va qancha bonus olishi aniq emas.",
      },
      {
        icon: "packageX",
        title: "Omborda kamomad",
        text: "Hisobda bor, polkada yo'q. Qayerga ketgani noma'lum.",
      },
    ],
  },

  features: {
    title: "Imkoniyatlar",
    subtitle: "Qurilish mollari do'koniga kerak bo'lgan hamma narsa — bitta tizimda",
    items: [
      {
        icon: "fileText",
        title: "Smeta 1 daqiqada",
        text: "Mahsulotlarni tanlang — smeta tayyor, chop eting yoki mijozga yuboring. Keyin bir bosishda sotuvga aylantiring.",
        screen: "/screens/smeta.png",
      },
      {
        icon: "bookOpen",
        title: "Nasiya nazoratda",
        text: "Kim, qancha va qachongacha qarzdor — aniq. Muddat yaqinlashsa mijozga Telegramda eslatma boradi.",
        screen: "/screens/nasiya.png",
      },
      {
        icon: "hardHat",
        title: "Usta bonusi — adolatli",
        text: "Usta olib kelgan har bir sotuvdan bonus avtomatik hisoblanadi. Janjalsiz, qog'ozsiz.",
        screen: "/screens/bonus.png",
      },
      {
        icon: "warehouse",
        title: "Ombor va kirim",
        text: "Har bir qop va metr hisobda. Kirim, hisobdan chiqarish va inventarizatsiya — kamomad darhol ko'rinadi.",
        screen: "/screens/ombor.png",
      },
      {
        icon: "tags",
        title: "Narxni ommaviy o'zgartirish",
        text: "Zavod narxni oshirdimi? Kategoriya bo'yicha barcha narxlarni bir martada yangilang.",
        screen: "/screens/narx.png",
      },
      {
        icon: "send",
        title: "Ega uchun Telegram bot",
        text: "Har kuni kechqurun tushum, nasiya va kam qolgan tovarlar haqida hisobot — do'konga bormasdan.",
        screen: "/screens/telegram.png",
      },
    ],
    screenPlaceholder: "Skrinshot tez orada",
  },

  how: {
    title: "Qanday ishlaydi",
    steps: [
      {
        title: "Biz do'koningizga kelamiz",
        text: "Mahsulotlaringizni, narxlarni va qoldiqni tizimga o'zimiz kiritamiz.",
      },
      {
        title: "Sotuvchini o'rgatamiz",
        text: "Kassa, smeta va nasiyani bir soatda o'rgatamiz. Murakkab narsa yo'q.",
      },
      {
        title: "Siz Telegramdan nazorat qilasiz",
        text: "Tushum, qarzdorlar va ombor holati — telefoningizda, istalgan joyda.",
      },
    ],
  },

  audience: {
    title: "Kim uchun",
    soon: "Tez orada",
    main: "Asosiy",
    items: [
      { icon: "brickWall", title: "Qurilish mollari", active: true },
      { icon: "shoppingBasket", title: "Oziq-ovqat", active: false },
      { icon: "shirt", title: "Kiyim", active: false },
      { icon: "smartphone", title: "Elektronika", active: false },
      { icon: "wrench", title: "Xo'jalik mollari", active: false },
    ],
  },

  pricing: {
    title: "Narxlar",
    subtitle: "Barcha paketlarda 30 kun bepul sinov",
    perMonth: "/ oy",
    popular: "Ko'p tanlanadi",
    choose: "Tanlash",
    more: "Batafsil narxlar",
    setup: "Ulanish",
    oneTime: "bir martalik",
    plusEquipment: "+ jihoz",
    monthlyLabel: "Oylik to'lov",
    billingMonthly: "Oylik",
    billingAnnual: "Yillik",
    annualBadge: "2 oy bepul",
    annualNote: "Yillik to'lov: {total} (12 oy o'rniga 10 oy)",
    includes: "Paketga kiradi",
    // Raqamlar — lib/pricing.ts. Bu yerda faqat matn.
    // DIQQAT: paket tarkibi (import, tashriflar, sozlash, yordam) — loyiha egasi tasdiqlashi kerak
    plans: {
      standard: {
        name: "Standart",
        tagline: "Kichik do'kon uchun tez start",
        features: [
          { label: "Import", value: "Mahsulotlar ro'yxatini (Excel) tizimga kiritamiz" },
          { label: "O'qitish", value: "1 ta tashrif — sotuvchi va egasi uchun" },
          { label: "Sozlash", value: "Masofadan: kassa, chek, Telegram bot" },
          { label: "Yordam", value: "Telegramda, ish vaqtida" },
        ],
      },
      custom: {
        name: "Moslashtirilgan",
        tagline: "Do'koningizga to'liq moslab beramiz",
        features: [
          { label: "Import", value: "Mahsulotlar, qoldiqlar va eski nasiyalar" },
          { label: "O'qitish", value: "3 ta tashrif — birinchi oy davomida" },
          { label: "Sozlash", value: "Do'konda: smeta, chek, ustalar va bonuslar" },
          { label: "Yordam", value: "Telegram va telefon, ustuvor navbat" },
        ],
      },
      turnkey: {
        name: "Kalit topshirish",
        tagline: "Jihoz bilan birga — hech narsa o'ylamaysiz",
        features: [
          { label: "Import", value: "Mahsulotlar, qoldiqlar va eski nasiyalar" },
          { label: "O'qitish", value: "3 ta tashrif + 1 oy kuzatuv" },
          { label: "Sozlash", value: "Jihozlarni o'rnatib, ulab beramiz" },
          { label: "Yordam", value: "Ustuvor navbat, kerak bo'lsa joyiga chiqamiz" },
        ],
      },
    },
    pageTitle: "Narxlar",
    pageSubtitle:
      "Ulanish bir marta to'lanadi, keyin — oylik obuna. Barcha paketlarda 30 kun kafolat.",
    equipmentLink: "Jihozlar narxi",
  },

  equipment: {
    title: "Jihozlar",
    subtitle: "Kassa uchun kerakli jihozlar — tayyor to'plam. Biz o'rnatib, dasturga ulab beramiz.",
    askPrice: "Narxni so'rang",
    order: "Jihozni bizdan buyurtma qilish",
    have: "Jihozingiz bormi? Mos kelsa, o'shani ulab beramiz.",
    formTitle: "Jihozga buyurtma",
    formMessage: "Jihoz",
    formSubtitle: "Ma'lumotlaringizni qoldiring — to'plam va narxni telefonda aniqlashtiramiz.",
    // DIQQAT: tarkib va texnik tavsif — loyiha egasi tasdiqlashi kerak. Narx — lib/pricing.ts
    kits: {
      econom: {
        name: "Ekonom to'plam",
        tagline: "Kichik do'kon, bitta kassa",
        message: "Jihoz: Ekonom to'plam",
        items: [
          { label: "Kompyuter", value: "Mini-kompyuter yoki noutbuk, 8 GB xotira" },
          { label: "Chek printeri", value: "Termoprinter, 80 mm, USB" },
          { label: "Skaner", value: "Shtrix-kod skaneri (simli)" },
          { label: "Pul qutisi", value: "Printerga ulanadigan, avtomatik ochiladi" },
        ],
      },
      standard: {
        name: "Standart to'plam",
        tagline: "Faol savdo, tez ishlash",
        message: "Jihoz: Standart to'plam",
        items: [
          { label: "Kompyuter", value: "Monoblok, sensorli ekran, 8 GB xotira, SSD" },
          { label: "Chek printeri", value: "Termoprinter, 80 mm, avtokesish, USB/LAN" },
          { label: "Skaner", value: "Simsiz shtrix-kod skaneri" },
          { label: "Pul qutisi", value: "Metall, 5 ta qog'oz pul bo'limi" },
        ],
      },
    },
  },

  faqPage: {
    title: "Ko'p beriladigan savollar",
    subtitle: "Javob topmadingizmi? Bizga yozing yoki qo'ng'iroq qiling.",
    more: "Barcha savollar",
    // DIQQAT: to'lov va shartnoma javoblari — loyiha egasi tasdiqlashi kerak
    items: [
      {
        q: "Kompyuterni bilmasam-chi?",
        a: "Muammo emas. Mahsulotlarni biz kiritamiz, sotuvchini o'zimiz o'rgatamiz. Kassada asosan sichqoncha va skaner bilan ishlanadi. Siz esa natijani Telegramda ko'rasiz.",
      },
      {
        q: "Internet uzilsa-chi?",
        a: "Hozircha dastur onlayn ishlaydi — internet kerak. Shuning uchun asosiy internetdan tashqari zaxira sifatida mobil internet (modem yoki telefon orqali) tavsiya qilamiz. Oflayn rejim keyingi versiyalarda bo'ladi.",
      },
      {
        q: "Ma'lumotim xavfsizmi?",
        a: "Har bir do'konning ma'lumoti alohida saqlanadi, boshqa do'kon ko'ra olmaydi. Har bir xodim o'z paroli bilan kiradi va faqat kerakli bo'limlarni ko'radi. Xodimni bloklasangiz — darhol kira olmaydi.",
      },
      {
        q: "Eski nasiyalarni kiritasizlarmi?",
        a: "Ha. Daftardagi qarzdorlar ro'yxatini (ism, telefon, summa, muddat) bizga bering — ulanish paytida tizimga kiritib beramiz.",
      },
      {
        q: "Filiallarim bor. Bo'ladimi?",
        a: "Ha. Har bir filial tizimda alohida do'kon sifatida ulanadi: o'z kassasi, ombori va xodimlari bilan. Barcha filiallar bo'yicha umumiy hisobot keyingi versiyalarda qo'shiladi.",
      },
      {
        q: "To'lov qanday qilinadi?",
        a: "Ulanish bir marta, keyin oylik yoki yillik obuna (yillikda 2 oy bepul). Bank o'tkazmasi yoki boshqa qulay usulda — shartnoma asosida.",
      },
      {
        q: "Shartnoma tuziladimi?",
        a: "Ha. Saytdagi ommaviy oferta asosida ishlaymiz; kerak bo'lsa, alohida yozma shartnoma ham tuzamiz.",
      },
      {
        q: "Yoqmasa-chi?",
        a: "30 kun ichida yoqmasa — obuna puli qaytariladi. Hech qanday shart va savolsiz.",
      },
      {
        q: "Qaysi printer mos keladi?",
        a: "80 mm termoprinterlar (chek printerlari) — kompyuterga drayveri o'rnatilsa, deyarli hammasi ishlaydi. Smeta oddiy A4 printerda chop etiladi. Printeringiz bo'lsa, ulab, tekshirib beramiz.",
      },
      {
        q: "Demo nima?",
        a: "Do'koningizga kelib, dasturni o'z mahsulotlaringiz misolida ko'rsatib beramiz — bepul va majburiyatsiz. Yoki 30 kun bepul sinab ko'rasiz.",
      },
    ],
  },

  pilot: {
    meta: "Pilot dasturi — birinchi 10 ta do'kon uchun maxsus taklif",
    badge: "Faqat {total} ta do'kon uchun",
    title: "Pilot dasturi: birinchi bo'ling",
    subtitle:
      "Farg'ona vodiysidagi qurilish mollari do'konlari uchun savdo tizimi. Birinchi {total} ta do'konga — maxsus shartlar.",
    seatsLeft: "Qolgan o'rinlar: {left} / {total}",
    soldOut: "O'rinlar tugadi — navbatga yoziling, keyingi guruhga taklif qilamiz.",
    offers: [
      { title: "{months} oy bepul", text: "Birinchi oy obuna to'lovi yo'q" },
      { title: "Ulanish {percent}% arzon", text: "Masalan, Standart: {old} o'rniga {new}" },
      { title: "Shaxsiy yordam", text: "Har bir savolingizga birinchi navbatda javob beramiz" },
    ],
    whatYouGet: "Nima olasiz",
    benefits: [
      "Nasiya daftari o'rniga — aniq qarzdorlar ro'yxati va eslatmalar",
      "Smeta 1 daqiqada, chop etish va sotuvga aylantirish",
      "Usta bonusi avtomatik — janjalsiz",
      "Ombor qoldig'i va kamomad nazorati",
      "Har kuni Telegramda hisobot",
    ],
    formTitle: "Pilotga yozilish",
    formSubtitle: "Raqamingizni qoldiring — 24 soat ichida qo'ng'iroq qilamiz.",
    message: "Pilot dasturi",
  },

  contact: {
    title: "Aloqa",
    subtitle: "Savolingiz bormi? Qo'ng'iroq qiling, yozing yoki raqamingizni qoldiring.",
    workHoursLabel: "Ish vaqti",
    workHours: "[Du–Sha, 9:00–18:00]",
    mapLabel: "Xaritada",
    mapOpen: "Xaritada ochish",
    // Manzil xaritasi havolasi (Yandex yoki Google Maps). Bo'sh — "xarita tez orada" joy-belgisi
    mapUrl: "",
    mapPlaceholder: "Xarita tez orada",
    call: "Qo'ng'iroq qilish",
    write: "Telegramda yozish",
    formTitle: "Qo'ng'iroq qilishimizni so'rang",
    formSubtitle: "Raqamingizni qoldiring — 24 soat ichida qo'ng'iroq qilamiz.",
    formMessage: "Aloqa sahifasi",
  },

  guarantee: {
    title: "30 kun ichida yoqmasa — obuna puli qaytariladi",
    text: "Hech qanday shart va savolsiz. Biz tizimimizga ishonamiz.",
  },

  testimonials: {
    title: "Mijozlarimiz fikri",
    // Faqat HAQIQIY fikrlar (mijoz roziligi bilan). Bo'sh bo'lsa — bo'lim saytda ko'rinmaydi.
    items: [] as Testimonial[],
  },

  lead: {
    title: "Ko'rsatib berishimizni so'rang",
    subtitle:
      "Raqamingizni qoldiring — qo'ng'iroq qilib, dasturni do'koningizda ko'rsatib beramiz.",
    trialTitle: "30 kun bepul sinash",
    trialSubtitle:
      "Kabinetingiz darhol ochiladi — namunaviy mahsulotlar bilan. Kassa, nasiya va smetani o'zingiz sinab ko'ring.",
    name: "Ismingiz",
    phone: "Telefon raqam",
    phonePlaceholder: "90 123 45 67",
    city: "Shahar",
    cityPlaceholder: "Tanlang",
    cities: { FERGANA: "Farg'ona", ANDIJAN: "Andijon", NAMANGAN: "Namangan", OTHER: "Boshqa" },
    shop: "Do'kon nomi",
    shopPlaceholder: "Masalan: Qurilish mollari, Qurilish bozori",
    submit: "Yuborish",
    sending: "Yuborilmoqda...",
    // Spam-tuzoq maydon (odamga ko'rinmaydi)
    honeypot: "Veb-sayt",
    errors: {
      name: "Ismingizni yozing",
      phone: "Telefon raqam noto'g'ri. Masalan: 90 123 45 67",
      city: "Shaharni tanlang",
      tooLong: "Juda uzun",
      rateLimited:
        "Juda ko'p urinish. Bir necha daqiqadan keyin qayta yuboring yoki qo'ng'iroq qiling: {phone}",
      unknown: "Xatolik yuz berdi. Qayta urinib ko'ring yoki qo'ng'iroq qiling: {phone}",
    },
  },

  thanks: {
    title: "Rahmat! 24 soat ichida qo'ng'iroq qilamiz",
    text: "Arizangiz qabul qilindi. Mutaxassisimiz siz bilan bog'lanib, qulay vaqtni kelishib oladi.",
    urgent: "Shoshilinch bo'lsa, o'zingiz qo'ng'iroq qiling: {phone}",
    back: "Bosh sahifaga qaytish",
  },

  footer: {
    phone: "[telefon]",
    telegram: "[Telegram]",
    telegramUrl: "",
    address: "[manzil]",
    phoneLabel: "Telefon",
    telegramLabel: "Telegram",
    addressLabel: "Manzil",
    privacy: "Maxfiylik siyosati",
    offer: "Ommaviy oferta",
    pages: "Sahifalar",
    rights: "Barcha huquqlar himoyalangan.",
  },

  legal: {
    back: "Bosh sahifaga",
    updated: "Tahrir sanasi",
  },

  consent: {
    // {offer} va {privacy} — havolalar bilan almashtiriladi
    label: "{offer} va {privacy}ga roziman",
    offer: "Oferta",
    privacy: "maxfiylik siyosati",
    required: "Davom etish uchun oferta va maxfiylik siyosatiga rozilik bering",
  },

  // /register — o'zi ro'yxatdan o'tish: sinov do'koni darhol ochiladi
  signup: {
    password: "Parol o'ylab toping",
    passwordHint: "Kamida 8 belgi. Keyin shu telefon va parol bilan kirasiz.",
    submit: "Kabinetni ochish",
    haveAccount: "Hisobingiz bormi?",
    login: "Kirish",
    // Do'kon nomi yozilmasa
    defaultShopName: "{name} do'koni",
    errors: {
      passwordShort: "Parol kamida 8 belgidan iborat bo'lsin",
      passwordLong: "Parol juda uzun",
      phoneTaken: "Bu raqam allaqachon ro'yxatdan o'tgan. Telefon va parolingiz bilan kiring.",
    },
  },

  // Qidiruv tizimlari va ijtimoiy tarmoqlar (Telegram havola ko'rinishi) uchun
  seo: {
    keywords: [
      "qurilish do'koni uchun dastur",
      "nasiya dasturi",
      "smeta dasturi",
      "kassa dasturi Farg'ona",
      "qurilish mollari do'koni",
      "ombor dasturi",
    ],
    // Telegram/Facebook'da havola rasmi ostidagi qisqa yozuv
    ogAlt: "Qurilish mollari do'konlari uchun kassa, nasiya va smeta dasturi",
    pages: {
      home: {
        title: "Qurilish do'koni uchun dastur: kassa, nasiya va smeta",
        description:
          "Qurilish mollari do'koni uchun kassa dasturi: nasiya daftari, smeta 1 daqiqada, usta bonusi va ombor. Farg'ona, Andijon, Namangan. 30 kun bepul.",
      },
      pricing: {
        title: "Narxlar — kassa dasturi Farg'ona",
        description:
          "Qurilish do'koni uchun dastur narxi: 3 ta paket, ulanish va oylik obuna. Yillik to'lovda 2 oy bepul, 30 kun ichida yoqmasa pul qaytariladi.",
      },
      equipment: {
        title: "Kassa jihozlari: kompyuter, chek printeri, skaner",
        description:
          "Qurilish mollari do'koni kassasi uchun tayyor to'plam: kompyuter, 80 mm chek printeri, shtrix-kod skaneri va pul qutisi. O'rnatib, dasturga ulab beramiz.",
      },
      faq: {
        title: "Savollar: nasiya dasturi, smeta dasturi va kassa",
        description:
          "Kompyuterni bilmasam-chi? Internet uzilsa-chi? Eski nasiyalar, filiallar, to'lov va kafolat — qurilish do'koni dasturi haqida ko'p so'raladigan savollar.",
      },
      pilot: {
        title: "Pilot dasturi: 1 oy bepul, ulanish 50% arzon",
        description:
          "Farg'ona vodiysidagi birinchi 10 ta qurilish mollari do'koni uchun: 1 oy bepul, ulanish yarim narxda, shaxsiy yordam. Kassa, nasiya va smeta dasturi.",
      },
      contact: {
        title: "Aloqa — qurilish do'koni uchun dastur",
        description:
          "Qo'ng'iroq qiling yoki Telegramda yozing — kassa, nasiya va smeta dasturini do'koningizda ko'rsatib beramiz. Farg'ona vodiysi.",
      },
      register: {
        title: "30 kun bepul sinash — kassa va nasiya dasturi",
        description:
          "Qurilish do'koni uchun dasturni 30 kun bepul sinab ko'ring: kabinet darhol ochiladi. Kassa, nasiya, smeta, usta bonusi va ombor.",
      },
      thanks: {
        title: "Rahmat!",
        description: "Arizangiz qabul qilindi. 24 soat ichida qo'ng'iroq qilamiz.",
      },
      offer: {
        title: "Ommaviy oferta",
        description: "Kassa, nasiya va smeta dasturidan foydalanish shartlari (ommaviy oferta).",
      },
      privacy: {
        title: "Maxfiylik siyosati",
        description: "Shaxsiy ma'lumotlarni yig'ish, saqlash va himoya qilish tartibi.",
      },
    },
  },

  cookie: {
    text: "Saytda cookie-fayllar ishlatiladi. Batafsil —",
    link: "maxfiylik siyosati",
    ok: "Tushunarli",
  },

  telegramButton: "Telegramda yozish",

  news: {
    title: "Yangiliklar",
    subtitle: "Dasturdagi yangi imkoniyatlar va o'zgarishlar",
    empty: "Hozircha yangilik yo'q",
    back: "Barcha yangiliklar",
    posterLabel: "Yangilik",
    posterMore: "Batafsil",
    posterClose: "Yopish",
    metaDescription: "Qurilish do'koni dasturidagi yangi imkoniyatlar va o'zgarishlar.",
  },
} as const;

export type Marketing = typeof marketing;
