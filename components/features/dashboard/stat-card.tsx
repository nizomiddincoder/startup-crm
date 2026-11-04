import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "danger" | "warning";
  testId?: string;
  /** Bosilganda raqam qayerdan kelganini ko'rsatadigan ro'yxat */
  href?: string;
};

/** Bosh sahifadagi ko'rsatkich kartochkasi. `href` bo'lsa — tugma (batafsil ro'yxatga o'tadi). */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  testId,
  href,
}: Props) {
  const body = (
    <>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          tone === "danger" && "bg-destructive/10 text-destructive",
          tone === "warning" && "bg-warning text-warning-foreground",
          tone === "default" && "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold tabular-nums" data-testid={testId}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {href && (
        <ChevronRight className="size-5 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      )}
    </>
  );
  const className = "flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-card";
  return href ? (
    <Link
      href={href}
      className={cn(
        className,
        "group transition hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
