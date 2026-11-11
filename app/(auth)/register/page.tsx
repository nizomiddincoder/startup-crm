import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { RegisterForm } from "@/components/features/auth/register-form";
import { uz } from "@/lib/i18n/uz";

export const metadata = { title: uz.register.title };

export default function RegisterPage() {
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
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl leading-tight font-bold">{uz.register.title}</h2>
            <p className="text-sm opacity-90">{uz.register.subtitle}</p>
          </div>
          <p className="text-xs opacity-80">{uz.app.description}</p>
        </section>

        <section className="flex flex-col justify-center gap-6 p-8 md:p-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{uz.register.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground md:hidden">{uz.register.subtitle}</p>
          </div>
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground">
            {uz.register.haveAccount}{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {uz.register.login}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
