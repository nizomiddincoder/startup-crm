/**
 * Reklama hodisalari (Meta Pixel, GA4). Server forma muvaffaqiyatli yuborilgach hodisa nomini
 * qisqa muddatli cookie'ga yozadi, keyingi sahifada brauzer uni o'qib, yuboradi va o'chiradi.
 * Shunda "Lead" faqat haqiqatan yuborilgan arizada sanaladi (forma xatosida emas).
 */
export const TRACK_COOKIE = "kassa_evt";

export const TRACK_EVENTS = ["Lead", "CompleteRegistration"] as const;
export type TrackEvent = (typeof TRACK_EVENTS)[number];

/** GA4'dagi tavsiya etilgan nomlar. */
export const GA_EVENT: Record<TrackEvent, string> = {
  Lead: "generate_lead",
  CompleteRegistration: "sign_up",
};

export function parseTrackEvent(value: string | undefined): TrackEvent | null {
  return TRACK_EVENTS.find((e) => e === value) ?? null;
}
