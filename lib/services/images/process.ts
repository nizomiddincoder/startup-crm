/**
 * Rasmni qayta ishlash (sharp): yuklangan rasm siqiladi, kassa uchun — oq fonli kvadrat.
 * Barcha natijalar WebP (kichik hajm, barcha brauzerlar ko'rsatadi).
 */
import sharp from "sharp";
import { uz } from "@/lib/i18n/uz";
import { ServiceError } from "../errors";

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
/** Kassa kartochkasi uchun kvadrat o'lcham */
export const STANDARD_SIZE = 512;
const ORIGINAL_MAX = 1280;

export function assertUpload(file: { size: number; type: string }) {
  if (file.size === 0) throw new ServiceError(uz.images.empty, "image");
  if (file.size > MAX_UPLOAD_BYTES) throw new ServiceError(uz.images.tooLarge, "image");
  if (!ACCEPTED_MIME.includes(file.type)) throw new ServiceError(uz.images.badType, "image");
}

/** Asl rasm: aylanish (EXIF) to'g'rilanadi, uzun tomoni ≤ 1280 px, WebP. */
export async function normalizeOriginal(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input)
      .rotate()
      .resize(ORIGINAL_MAX, ORIGINAL_MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ServiceError(uz.images.badType, "image");
  }
}

/** Kassa uchun: oq fonda, markazda, 512×512 kvadrat (rasm cho'zilmaydi). */
export async function toStandardSquare(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(STANDARD_SIZE, STANDARD_SIZE, { fit: "contain", background: "#ffffff" })
    .webp({ quality: 85 })
    .toBuffer();
}
