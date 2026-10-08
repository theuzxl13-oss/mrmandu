/** Espelha o enum Role do Prisma, mas sem dependência do client (seguro para o middleware/edge). */
export const ROLES = ["CLIENT", "BARBER", "ADMIN"] as const;
export type UserRole = (typeof ROLES)[number];

export type LoginPortal = "client" | "staff";

/** Usuário autenticado já revalidado contra o banco. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Preenchido quando role = BARBER. */
  barberId: string | null;
}
