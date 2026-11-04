import { Prisma } from "@prisma/client";

/**
 * Biznes xatosi: foydalanuvchiga ko'rsatiladigan matn bilan.
 * `field` berilsa, forma xatoni shu maydon ostida ko'rsatadi.
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Prisma'ning "yagona qiymat takrorlandi" (P2002) xatosimi. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
