import type { DefaultSession } from "next-auth";
import type { UserRole } from "./auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    sessionVersion: number;
  }
  interface Session {
    user: {
      id: string;
      role: UserRole;
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: UserRole;
    sv?: number;
  }
}
