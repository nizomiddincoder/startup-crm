import { afterEach, describe, expect, it, vi } from "vitest";
import { GA_EVENT, parseTrackEvent } from "./analytics";
import { analyticsIds, isPlaceholder, siteUrl, telegramContactUrl } from "./site-config";

afterEach(() => vi.unstubAllEnvs());

describe("sayt sozlamalari (env)", () => {
  it("SITE_URL: oxiridagi / olib tashlanadi, bo'sh bo'lsa — localhost", () => {
    vi.stubEnv("SITE_URL", "https://kassa.uz/");
    expect(siteUrl()).toBe("https://kassa.uz");
    vi.stubEnv("SITE_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("analitika ID'lari: bo'sh yoki g'alati qiymat — yuklanmaydi", () => {
    vi.stubEnv("META_PIXEL_ID", "");
    vi.stubEnv("GA_MEASUREMENT_ID", "");
    expect(analyticsIds()).toEqual({ pixelId: undefined, gaId: undefined });
    vi.stubEnv("META_PIXEL_ID", " 1234567890 ");
    vi.stubEnv("GA_MEASUREMENT_ID", "G-ABC123");
    expect(analyticsIds()).toEqual({ pixelId: "1234567890", gaId: "G-ABC123" });
    vi.stubEnv("GA_MEASUREMENT_ID", 'G-1"><script>');
    expect(analyticsIds().gaId).toBeUndefined();
  });

  it("Telegram havolasi faqat https", () => {
    vi.stubEnv("TELEGRAM_CONTACT_URL", "https://t.me/kassa_yordam");
    expect(telegramContactUrl()).toBe("https://t.me/kassa_yordam");
    vi.stubEnv("TELEGRAM_CONTACT_URL", "javascript:alert(1)");
    expect(telegramContactUrl()).toBeNull();
  });

  it("[kvadrat qavsdagi] qiymat — to'ldirilmagan", () => {
    expect(isPlaceholder("[telefon]")).toBe(true);
    expect(isPlaceholder("")).toBe(true);
    expect(isPlaceholder("+998 90 123 45 67")).toBe(false);
  });

  it("reklama hodisalari: faqat ma'lum nomlar", () => {
    expect(parseTrackEvent("Lead")).toBe("Lead");
    expect(parseTrackEvent("CompleteRegistration")).toBe("CompleteRegistration");
    expect(parseTrackEvent("Purchase")).toBeNull();
    expect(GA_EVENT.CompleteRegistration).toBe("sign_up");
  });
});
