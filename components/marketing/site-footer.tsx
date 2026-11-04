import { MapPin, Phone, Send } from "lucide-react";
import Link from "next/link";
import { marketing as m } from "@/lib/i18n/marketing.uz";
import { telegramContactUrl } from "@/lib/site-config";
import { Logo } from "./site-header";

export function SiteFooter() {
  const f = m.footer;
  const telHref = `tel:${f.phone.replace(/[^\d+]/g, "")}`;
  const telegramUrl = telegramContactUrl();
  return (
    <footer className="border-t bg-card px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{m.meta.description}</p>
        </div>

        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-2">
            <Phone className="size-4 text-primary" aria-hidden />
            <span className="text-muted-foreground">{f.phoneLabel}:</span>
            <a href={telHref} className="font-medium hover:text-primary">
              {f.phone}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Send className="size-4 text-primary" aria-hidden />
            <span className="text-muted-foreground">{f.telegramLabel}:</span>
            {telegramUrl ? (
              <a href={telegramUrl} className="font-medium hover:text-primary" rel="noreferrer">
                {f.telegram}
              </a>
            ) : (
              <span className="font-medium">{f.telegram}</span>
            )}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" aria-hidden />
            <span className="text-muted-foreground">{f.addressLabel}:</span>
            <span className="font-medium">{f.address}</span>
          </li>
        </ul>

        <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[
            { href: "/narxlar", label: m.nav.pricing },
            { href: "/oferta", label: f.offer },
            { href: "/jihozlar", label: m.nav.equipment },
            { href: "/maxfiylik", label: f.privacy },
            { href: "/savollar", label: m.nav.faq },
            { href: "/pilot", label: m.nav.pilot },
            { href: "/aloqa", label: m.nav.contact },
            { href: "/yangiliklar", label: m.nav.news },
          ].map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-primary">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-muted-foreground">
        © {new Date().getFullYear()} {m.brand}. {f.rights}
      </p>
    </footer>
  );
}
