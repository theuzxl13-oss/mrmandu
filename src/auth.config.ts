import type { NextAuthConfig } from "next-auth";
import { ROLES, type UserRole } from "@/types/auth";

const SESSION_MAX_AGE = 60 * 60 * 12; // 12 horas

/**
 * Configuração compatível com o Edge (usada pelo middleware).
 * Não importa Prisma/bcrypt — o provider de credenciais fica em src/auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/entrar" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.sv = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid && token.role && (ROLES as readonly string[]).includes(token.role)) {
        session.user.id = token.uid;
        session.user.role = token.role as UserRole;
        session.user.sessionVersion = token.sv ?? 0;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
