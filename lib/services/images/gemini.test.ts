import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiConfig, geminiImage, generatePrompt, standardizePrompt } from "./gemini";

afterEach(() => vi.unstubAllEnvs());

describe("Gemini rasm so'rovi", () => {
  it("kalit va model sarlavha/manzilda; javobdagi rasm qaytariladi", async () => {
    vi.stubEnv("GEMINI_API_KEY", "abc");
    vi.stubEnv("GEMINI_IMAGE_MODEL", "gemini-test-image");
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: "mana" },
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: Buffer.from("PNG").toString("base64"),
                    },
                  },
                ],
              },
            },
          ],
        }),
      );
    }) as unknown as typeof fetch;

    const result = await geminiImage(
      "prompt",
      { data: Buffer.from("img"), mime: "image/webp" },
      fetchImpl,
    );
    expect(result).toEqual({ data: Buffer.from("PNG"), mime: "image/png" });
    expect(calls[0].url).toContain("/models/gemini-test-image:generateContent");
    expect((calls[0].init.headers as Record<string, string>)["x-goog-api-key"]).toBe("abc");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.generationConfig.responseModalities).toEqual(["IMAGE"]);
    expect(body.contents[0].parts[1].inlineData.mimeType).toBe("image/webp");
  });

  it("xato javob va rasmsiz javob — Error; kalit bo'lmasa — Error", async () => {
    vi.stubEnv("GEMINI_API_KEY", "abc");
    const bad = (async () => new Response("quota", { status: 429 })) as unknown as typeof fetch;
    await expect(geminiImage("p", undefined, bad)).rejects.toThrow("429");
    const empty = (async () =>
      new Response(JSON.stringify({ candidates: [] }))) as unknown as typeof fetch;
    await expect(geminiImage("p", undefined, empty)).rejects.toThrow("rasm yo'q");
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(geminiImage("p", undefined, bad)).rejects.toThrow("GEMINI_API_KEY");
  });

  it("sozlamalar: sukut model va limit", () => {
    vi.stubEnv("GEMINI_IMAGE_MODEL", "");
    vi.stubEnv("GEMINI_DAILY_LIMIT", "");
    expect(geminiConfig()).toMatchObject({ model: "gemini-2.5-flash-image", dailyLimit: 30 });
  });

  it("prompt: oq fon, matnsiz; mahsulot nomi va kategoriyasi", () => {
    const p = generatePrompt({ name: "Sement M400", category: "Sement", unit: "the bag" });
    expect(p).toContain("pure white background");
    expect(p).toContain("No text");
    expect(p).toContain('"Sement M400"');
    expect(p).toContain('category: "Sement"');
    expect(standardizePrompt({ name: "Profil" })).toContain("attached photo");
  });
});
