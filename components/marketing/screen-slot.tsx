import { existsSync } from "node:fs";
import path from "node:path";
import { MonitorSmartphone } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  /** public/ ichidagi yo'l, masalan "/screens/hero.png" */
  src: string;
  alt: string;
  label: string;
  /** Birinchi ekrandagi rasm — darhol yuklansin */
  priority?: boolean;
  /** Rasm hali yo'q bo'lsa, telefonda bo'sh joy-belgini ko'rsatmaslik (sahifa qisqaroq) */
  hidePlaceholderOnMobile?: boolean;
  className?: string;
};

/**
 * Dastur skrinshoti uchun joy. Fayl public/ ichida bo'lsa — next/image (avtomatik siqiladi,
 * kerakli o'lchamda yuklanadi). Bo'lmasa — yengil placeholder (rasm yuklanmaydi).
 */
export function ScreenSlot({
  src,
  alt,
  label,
  priority,
  hidePlaceholderOnMobile,
  className,
}: Props) {
  const exists = existsSync(path.join(process.cwd(), "public", src));
  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-card shadow-card",
        !exists && hidePlaceholderOnMobile && "hidden sm:block",
        className,
      )}
    >
      {exists ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover object-top"
        />
      ) : (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 bg-accent/60 text-accent-foreground"
          role="img"
          aria-label={alt}
        >
          <MonitorSmartphone className="size-10 opacity-60" strokeWidth={1.5} />
          <span className="text-xs font-medium opacity-80">{label}</span>
        </div>
      )}
    </div>
  );
}
