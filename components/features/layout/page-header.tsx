import { formatLongDate } from "@/lib/services/format";

type Props = {
  title: string;
  /** Sarlavha ustidagi kichik matn. Berilmasa — bugungi sana (referensdagidek) */
  eyebrow?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

/** Sahifa sarlavhasi: kichik sana/do'kon nomi + katta sarlavha + o'ngda amallar. */
export function PageHeader({ title, eyebrow, description, actions }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{eyebrow ?? formatLongDate(new Date())}</p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
