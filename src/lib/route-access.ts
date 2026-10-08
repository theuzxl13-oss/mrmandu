import type { UserRole } from "@/types/auth";

/** Página inicial de cada perfil após o login. */
export const ROLE_HOME: Record<UserRole, string> = {
  CLIENT: "/cliente",
  BARBER: "/barbeiro",
  ADMIN: "/admin",
};

const PROTECTED_PREFIXES: ReadonlyArray<{ prefix: string; roles: readonly UserRole[] }> = [
  { prefix: "/cliente", roles: ["CLIENT"] },
  { prefix: "/barbeiro", roles: ["BARBER"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Perfis permitidos para uma rota, ou null se a rota for pública. */
export function allowedRolesForPath(pathname: string): readonly UserRole[] | null {
  return PROTECTED_PREFIXES.find((p) => matches(pathname, p.prefix))?.roles ?? null;
}

export function canAccessPath(role: UserRole | null | undefined, pathname: string): boolean {
  const roles = allowedRolesForPath(pathname);
  if (!roles) return true;
  return !!role && roles.includes(role);
}

/** Evita open redirect: aceita apenas caminhos internos relativos. */
export function safeCallbackPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}
