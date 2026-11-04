/**
 * Login urinishlarini cheklash (parolni terib topishdan himoya).
 * Xotirada saqlanadi — bitta server nusxasi uchun yetarli (pilot). Bir nechta nusxada — Redis kerak.
 */

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

type Entry = { count: number; firstAt: number };

export function createLimiter(max = MAX_ATTEMPTS, windowMs = WINDOW_MS) {
  const failures = new Map<string, Entry>();

  function current(key: string, now: number): Entry | null {
    const e = failures.get(key);
    if (!e) return null;
    if (now - e.firstAt > windowMs) {
      failures.delete(key);
      return null;
    }
    return e;
  }

  return {
    /** Kalit hozir bloklanganmi; bloklangan bo'lsa — necha daqiqa qolgani. */
    check(key: string, now = Date.now()): { blocked: false } | { blocked: true; minutes: number } {
      const e = current(key, now);
      if (!e || e.count < max) return { blocked: false };
      return { blocked: true, minutes: Math.ceil((e.firstAt + windowMs - now) / 60_000) };
    },
    fail(key: string, now = Date.now()) {
      const e = current(key, now);
      if (e) e.count += 1;
      else failures.set(key, { count: 1, firstAt: now });
    },
    reset(key: string) {
      failures.delete(key);
    },
  };
}

/** Login uchun umumiy cheklovchi (telefon raqami bo'yicha). */
export const loginLimiter = createLimiter();
