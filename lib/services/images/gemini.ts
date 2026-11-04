/**
 * Google Gemini orqali rasm yaratish va tahrirlash (REST, kutubxonasiz).
 * Kalit: GEMINI_API_KEY. Model: GEMINI_IMAGE_MODEL (sukut — gemini-2.5-flash-image).
 * Kalit bo'lmasa — AI funksiyalari o'chiq, dastur oddiy ishlayveradi.
 */

export function geminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || null;
  const limit = Number(process.env.GEMINI_DAILY_LIMIT);
  return {
    apiKey,
    model: process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image",
    /** Har do'konga kuniga AI rasm so'rovlari (xarajat nazorati) */
    dailyLimit: Number.isInteger(limit) && limit > 0 ? limit : 30,
  };
}

export type GeneratedImage = { data: Buffer; mime: string };

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };

/**
 * Matn (+ ixtiyoriy rasm) → bitta rasm. Javobda rasm bo'lmasa yoki xato bo'lsa — Error.
 * `fetchImpl` — testlar uchun (tarmoqqa chiqmasdan).
 */
export async function geminiImage(
  prompt: string,
  image?: { data: Buffer; mime: string },
  fetchImpl: typeof fetch = fetch,
): Promise<GeneratedImage> {
  const { apiKey, model } = geminiConfig();
  if (!apiKey) throw new Error("GEMINI_API_KEY yo'q");
  const parts: Part[] = [{ text: prompt }];
  if (image)
    parts.push({ inlineData: { mimeType: image.mime, data: image.data.toString("base64") } });

  const res = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: Part[] } }[];
  };
  const found = json.candidates
    ?.flatMap((c) => c.content?.parts ?? [])
    .find((p) => p.inlineData?.data);
  if (!found?.inlineData) throw new Error("Gemini javobida rasm yo'q");
  return { data: Buffer.from(found.inlineData.data, "base64"), mime: found.inlineData.mimeType };
}

export type ChatTurn = { role: "user" | "model"; text: string };

/** Matnli javob (AI yordamchi): tizim ko'rsatmasi + suhbat tarixi. Model: GEMINI_TEXT_MODEL. */
export async function geminiText(
  system: string,
  turns: ChatTurn[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const { apiKey } = geminiConfig();
  if (!apiKey) throw new Error("GEMINI_API_KEY yo'q");
  const model = process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-2.5-flash";
  const res = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { candidates?: { content?: { parts?: Part[] } }[] };
  const answer = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!answer) throw new Error("Gemini javobi bo'sh");
  return answer;
}

/** Bir xil uslub: oq fon, markaz, studiya yorug'ligi — kassada barcha rasmlar bir xil ko'rinadi. */
const STYLE =
  "Studio e-commerce catalog photo. Single product centered, fully visible, on a pure white " +
  "background (#FFFFFF), soft even lighting, subtle natural shadow, square 1:1 composition, " +
  "photorealistic. No text, no letters, no logos, no watermark, no people, no hands.";

/** Rasm yo'q mahsulot uchun: nomi, kategoriyasi va o'lchov birligidan. */
export function generatePrompt(p: { name: string; category?: string | null; unit: string }) {
  return (
    `${STYLE}\nProduct: "${p.name}"` +
    (p.category ? `, category: "${p.category}"` : "") +
    `, sold by ${p.unit} in a construction materials and hardware store in Uzbekistan. ` +
    "Show exactly this product as it is typically packaged or sold."
  );
}

/** Yuklangan rasmni shu uslubga keltirish (mahsulotning o'zi o'zgarmaydi). */
export function standardizePrompt(p: { name: string }) {
  return (
    `${STYLE}\nRecreate the product from the attached photo as a clean catalog image. ` +
    `Keep the same product ("${p.name}"), its shape, colors and packaging; remove the ` +
    "background, clutter, price tags and reflections."
  );
}
