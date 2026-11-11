import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { uz } from "@/lib/i18n/uz";
import { siteUrl } from "@/lib/site-config";
import "./globals.css";

// Shrift fayllari shu yerda yuklanadi, ishlatilishi esa app/tokens.css orqali.
// O'zbek lotin matni (o', g', —) "latin" to'plamida bor — faqat shu oldindan yuklanadi (tezlik).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

// Faqat chek va raqamlar uchun (dastur ichida) — sotuv sayti sahifalarida oldindan yuklanmaydi
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  // OG rasm, canonical va sitemap'dagi to'liq manzillar shu domendan
  metadataBase: new URL(siteUrl()),
  title: uz.app.name,
  description: uz.app.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${jakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
