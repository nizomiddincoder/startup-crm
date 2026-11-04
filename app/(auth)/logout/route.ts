import { signOut } from "@/auth";

// Sessiyani tozalab, login sahifasiga yuboradi. requireUser() bloklangan xodim yoki o'chirilgan
// do'kon sessiyasini shu yerga yo'naltiradi (sahifa ichida cookie o'chirib bo'lmaydi).
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
