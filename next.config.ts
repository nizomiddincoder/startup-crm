import type { NextConfig } from "next";

// Brauzer xavfsizlik sarlavhalari: sahifani boshqa saytga joylab bo'lmaydi (clickjacking),
// fayl turini taxmin qilish o'chirilgan, kamera/mikrofon kerak emas.
// SAMEORIGIN (DENY emas): kassa chekni o'z saytidagi yashirin oynada chop etadi.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev rejimdagi "N" belgisi chap pastki burchakda "Chiqish" tugmasini yopib qo'yadi
  devIndicators: false,
  // Mahsulot rasmini yuklash server action orqali (sukut 1 MB — telefon rasmlari kattaroq)
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  async headers() {
    // Telegram Mini App (/miniapp) Telegram ichida iframe'da ochiladi: u yerda SAMEORIGIN o'rniga
    // faqat Telegram domenlariga ruxsat beriladi (frame-ancestors).
    const miniAppHeaders = [
      ...securityHeaders.filter((h) => h.key !== "X-Frame-Options"),
      {
        key: "Content-Security-Policy",
        value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
      },
    ];
    return [
      { source: "/((?!miniapp(?:/|$)).*)", headers: securityHeaders },
      { source: "/miniapp", headers: miniAppHeaders },
      { source: "/miniapp/:path*", headers: miniAppHeaders },
    ];
  },
};

export default nextConfig;
