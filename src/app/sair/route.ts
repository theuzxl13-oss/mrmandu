import { signOut } from "@/auth";

/**
 * Encerra a sessão. Usado quando a sessão JWT ainda existe mas o usuário foi
 * desativado ou trocou a senha (sessionVersion diferente).
 */
export async function GET(request: Request) {
  const expired = new URL(request.url).searchParams.get("expirada") === "1";
  await signOut({ redirectTo: expired ? "/entrar?expirada=1" : "/entrar" });
}
