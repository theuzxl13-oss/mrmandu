import { AppError } from "@/lib/errors";
import type { SessionUser, UserRole } from "@/types/auth";

/** Garante que existe um usuário autenticado com um dos perfis informados. */
export function assertRole(
  actor: SessionUser | null | undefined,
  ...roles: UserRole[]
): asserts actor is SessionUser {
  if (!actor) throw new AppError("UNAUTHENTICATED");
  if (roles.length && !roles.includes(actor.role)) throw new AppError("FORBIDDEN");
}

export const isAdmin = (actor: SessionUser) => actor.role === "ADMIN";
