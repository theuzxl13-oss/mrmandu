import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/route-access";
import { loadSessionUser } from "@/server/services/user.service";
import type { SessionUser, UserRole } from "@/types/auth";

/** Usuário atual revalidado no banco (memoizado por requisição). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return loadSessionUser(id, session.user.sessionVersion ?? 0);
});

/** Para páginas/layouts: redireciona se não autenticado ou sem permissão. */
export async function requirePageRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sair?expirada=1");
  if (roles.length && !roles.includes(user.role)) redirect(`${ROLE_HOME[user.role]}?erro=permissao`);
  return user;
}
