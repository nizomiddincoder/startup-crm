import type { UnitValue } from "@/lib/validation/product";
import { cn } from "@/lib/utils";
import { UnitIcon } from "./unit-icon";

/** Mahsulot rasmi (kassa standarti: oq fon, kvadrat) yoki rasm bo'lmasa — birlik ikonkasi. */
export function ProductThumb({
  product,
  className,
  iconClassName,
}: {
  product: { id: string; unit: UnitValue; imageVersion?: number };
  className?: string;
  iconClassName?: string;
}) {
  if (!product.imageVersion) {
    return <UnitIcon unit={product.unit} className={className} iconClassName={iconClassName} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- rasm o'z route'imizdan, kesh versiya bilan
    <img
      src={`/media/products/${product.id}?v=${product.imageVersion}`}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 rounded-xl bg-white object-contain", className)}
    />
  );
}
