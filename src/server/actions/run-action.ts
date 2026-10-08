import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AppError, ERROR_MESSAGES, isAppError } from "@/lib/errors";
import { assertRole } from "@/server/auth/permissions";
import { getCurrentUser } from "@/server/auth/session";
import type { SessionUser, UserRole } from "@/types/auth";

interface Options {
  revalidate?: string[];
  message?: string;
}

/** Converte exceções em ActionResult com mensagens amigáveis (sem vazar detalhes internos). */
export async function runAction<T>(fn: () => Promise<T>, opts: Options = {}): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    for (const path of opts.revalidate ?? []) revalidatePath(path, "layout");
    return { ok: true, data, message: opts.message };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ZodError) {
      const flat = error.flatten();
      return {
        ok: false,
        code: "VALIDATION",
        error: flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0] ?? ERROR_MESSAGES.VALIDATION,
        fieldErrors: flat.fieldErrors,
      };
    }
    if (isAppError(error)) return { ok: false, code: error.code, error: error.message };
    console.error("[action] erro inesperado:", error);
    return { ok: false, code: "INTERNAL", error: ERROR_MESSAGES.INTERNAL };
  }
}

/** Executa a action com o usuário autenticado (revalidado no banco) e checagem de perfil. */
export function withActor<T>(
  roles: UserRole[],
  fn: (actor: SessionUser) => Promise<T>,
  opts: Options = {},
): Promise<ActionResult<T>> {
  return runAction(async () => {
    const actor = await getCurrentUser();
    if (!actor) throw new AppError("UNAUTHENTICATED");
    assertRole(actor, ...roles);
    return fn(actor);
  }, opts);
}
