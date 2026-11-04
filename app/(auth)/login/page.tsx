import { BookOpen, ShoppingCart, Warehouse } from "lucide-react";
import { LoginForm } from "@/components/features/auth/login-form";
import { DEMO_PASSWORD, DEMO_USERS, isDemoMode } from "@/lib/demo";
import { uz } from "@/lib/i18n/uz";

const features = [
  { icon: ShoppingCart, text: uz.login.featurePos },
  { icon: Warehouse, text: uz.login.featureStock },
  { icon: BookOpen, text: uz.login.featureDebt },
];

// DEMO_MODE ishga tushirishda o'qiladi (yig'ish paytida emas) — sahifa har safar serverda chiziladi
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demo = isDemoMode()
    ? {
        password: DEMO_PASSWORD,
        users: DEMO_USERS.map(({ name, phone, role }) => ({ name, phone, role })),
      }
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-card md:grid-cols-2">
        <section className="hidden flex-col justify-between gap-10 bg-primary p-10 text-primary-foreground md:flex">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15">
              <ShoppingCart className="size-5" />
            </span>
            <span className="text-xl font-bold">{uz.app.name}</span>
          </div>
          <div className="flex flex-col gap-5">
            <h2 className="text-3xl leading-tight font-bold">{uz.login.headline}</h2>
            <ul className="flex flex-col gap-3">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs opacity-80">{uz.app.description}</p>
        </section>

        <section className="flex flex-col justify-center gap-6 p-8 md:p-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{uz.auth.loginTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{uz.auth.loginSubtitle}</p>
          </div>
          <LoginForm demo={demo} />
        </section>
      </div>
    </main>
  );
}
