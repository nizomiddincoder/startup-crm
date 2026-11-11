import { redirect } from "next/navigation";

// Sayt yo'q: bosh manzil to'g'ridan-to'g'ri kirish sahifasiga yo'naltiriladi
export default function Home() {
  redirect("/login");
}
