import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { allowedRolesForPath, canAccessPath, ROLE_HOME } from "@/lib/route-access";

const { auth } = NextAuth(authConfig);

/**
 * Primeira barreira (otimista, baseada no JWT). Cada página e cada server action
 * revalida o usuário no banco (src/server/auth/session.ts) — nunca confiamos só nisto.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (!allowedRolesForPath(pathname)) {
    // Usuário logado não precisa ver as telas de login.
    if (role && (pathname === "/entrar" || pathname.startsWith("/entrar/") || pathname === "/cadastro")) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!role) {
    const url = new URL("/entrar", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  if (!canAccessPath(role, pathname)) {
    const url = new URL(ROLE_HOME[role], req.nextUrl);
    url.searchParams.set("erro", "permissao");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/cliente/:path*", "/barbeiro/:path*", "/admin/:path*", "/entrar/:path*", "/entrar", "/cadastro"],
};
