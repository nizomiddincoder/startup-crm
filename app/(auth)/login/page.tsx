import { LoginForm } from "@/components/features/auth/login-form";
import { DEMO_PASSWORD, DEMO_PIN, DEMO_USERS, isDemoMode } from "@/lib/demo";

// DEMO_MODE ishga tushirishda o'qiladi (yig'ish paytida emas) — sahifa har safar serverda chiziladi
export const dynamic = "force-dynamic";

/** Yagona kirish: kassir — PIN, admin — "Admin kirish" orqali login va parol. */
export default function LoginPage() {
  const demo = isDemoMode()
    ? {
        password: DEMO_PASSWORD,
        pin: DEMO_PIN,
        users: DEMO_USERS.map(({ name, phone, role, login }) => ({ name, phone, role, login })),
      }
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-card md:p-8">
        <LoginForm demo={demo} />
      </div>
    </main>
  );
}
