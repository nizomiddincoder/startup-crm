import {
  Archive,
  Box,
  Boxes,
  Droplet,
  Layers,
  Package,
  Ruler,
  ScrollText,
  Square,
  Weight,
  type LucideIcon,
} from "lucide-react";
import type { UnitValue } from "@/lib/validation/product";
import { cn } from "@/lib/utils";

// Mahsulot rasmi bo'lmagani uchun kartochkada o'lchov birligiga mos ikonka
const byUnit: Record<UnitValue, LucideIcon> = {
  PIECE: Boxes,
  METER: Ruler,
  SQ_METER: Square,
  CUBIC_METER: Box,
  KG: Weight,
  TON: Weight,
  LITER: Droplet,
  BAG: Package,
  PACK: Package,
  ROLL: ScrollText,
  SHEET: Layers,
  BOX: Archive,
};

export function UnitIcon({
  unit,
  className,
  iconClassName = "size-9",
}: {
  unit: UnitValue;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = byUnit[unit];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground",
        className,
      )}
      aria-hidden
    >
      <Icon className={iconClassName} strokeWidth={1.5} />
    </span>
  );
}
