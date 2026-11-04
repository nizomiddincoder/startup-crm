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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
