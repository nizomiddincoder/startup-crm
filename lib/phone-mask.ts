/** "901234567" → "90 123 45 67" (yozish paytida). +998 alohida ko'rsatiladi. */
export function formatPhoneMask(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length > 9) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(" ");
}
