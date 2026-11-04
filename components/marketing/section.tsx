import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
};

/** Landing bo'limi: markazlashtirilgan kenglik, sarlavha va ichki kontent. */
export function Section({ id, title, subtitle, className, children }: Props) {
  return (
    <section id={id} className={cn("scroll-mt-20 px-4 py-14 md:py-20", className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {title && (
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-4xl">{title}</h2>
            {subtitle && <p className="text-muted-foreground md:text-lg">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
