import { buttonVariants } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";
import { Logo } from "./site-header";

/**
 * 404 va 500 sahifalari uchun umumiy ko'rinish. "Bosh sahifaga qaytish" — oddiy havola
 * (xatodan keyin ilova holati buzilgan bo'lsa ham to'liq qayta yuklanadi).
 */
export function ErrorScreen({
  code,
  title,
  text,
  children,
}: {
  code: string;
  title: string;
  text: string;
  /** Qo'shimcha tugma (masalan, "Qayta urinish") */
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center">
      <Logo />
      <p className="text-7xl font-extrabold tracking-tight text-primary" aria-hidden>
        {code}
      </p>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{text}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={buttonVariants({ size: "lg", className: "h-12" })}>
          {uz.errorPages.home}
        </a>
        {children}
      </div>
    </main>
  );
}
