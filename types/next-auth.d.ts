import type { Role } from "@/lib/services/permissions";

declare module "next-auth" {
  interface User {
    role: Role;
    tenantId: string;
    tenantName: string;
    phone: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      role: Role;
      tenantId: string;
      tenantName: string;
      phone: string;
      /** Kirgan vaqti (ms). `User.sessionsValidFrom`dan oldin bo'lsa — sessiya yaroqsiz. */
      loginAt: number;
      /** Shu kirishning noyob raqami — "Chiqish"da `RevokedSession`ga yoziladi. */
      sid: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    tenantId: string;
    tenantName: string;
    phone: string;
    loginAt?: number;
    sid?: string;
  }
}
