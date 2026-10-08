import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { isAppError } from "@/lib/errors";
import { authenticate } from "@/server/services/user.service";

/** Propaga o código do erro de domínio para a tela de login. */
class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, portal: {} },
      async authorize(credentials) {
        try {
          const user = await authenticate(credentials);
          return { id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
        } catch (error) {
          if (isAppError(error)) throw new LoginError(error.code);
          throw new LoginError("INVALID_CREDENTIALS");
        }
      },
    }),
  ],
});
