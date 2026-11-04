import { randomInt } from "node:crypto";

// Adashtiradigan belgilarsiz (0/O, 1/l/I) — telefon orqali aytib berish oson bo'lsin
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Yangi xodim yoki do'kon egasi uchun tasodifiy parol (8 belgi). */
export function generatePassword(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
