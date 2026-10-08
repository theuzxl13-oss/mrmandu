"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import type { ActionResult } from "@/lib/action-result";
import { ERROR_MESSAGES, type ErrorCode } from "@/lib/errors";
import { ROLE_HOME, canAccessPath, safeCallbackPath } from "@/lib/route-access";
import { db } from "@/server/db";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { requestPasswordReset, resetPassword } from "@/server/services/password-reset.service";
import { registerClient } from "@/server/services/user.service";
import { loginSchema } from "@/validations/auth";
import { runAction } from "./run-action";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

function errorFor(code: string | undefined): string {
  return code && code in ERROR_MESSAGES ? ERROR_MESSAGES[code as ErrorCode] : ERROR_MESSAGES.INVALID_CREDENTIALS;
}

export async function loginAction(input: unknown, callbackUrl?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION", error: ERROR_MESSAGES.VALIDATION };
  const { email, password, portal } = parsed.data;

  const key = `login:${email}:${await clientIp()}`;
  if (!rateLimit(key, 5, 15 * 60_000).allowed) {
    return { ok: false, code: "TOO_MANY_ATTEMPTS", error: ERROR_MESSAGES.TOO_MANY_ATTEMPTS };
  }

  try {
    await signIn("credentials", { email, password, portal, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) return { ok: false, error: errorFor(error.code) };
    if (error instanceof AuthError) return { ok: false, error: ERROR_MESSAGES.INVALID_CREDENTIALS };
    throw error;
  }
  resetRateLimit(key);

  const user = await db.user.findUniqueOrThrow({ where: { email }, select: { role: true } });
  const target = safeCallbackPath(callbackUrl);
  redirect(target && canAccessPath(user.role, target) && target !== "/" ? target : ROLE_HOME[user.role]);
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  if (!rateLimit(`register:${await clientIp()}`, 10, 60 * 60_000).allowed) {
    return { ok: false, code: "TOO_MANY_ATTEMPTS", error: ERROR_MESSAGES.TOO_MANY_ATTEMPTS };
  }
  const result = await runAction(() => registerClient(input));
  if (!result.ok) return result;

  const { password } = input as { password: string };
  await signIn("credentials", { email: result.data.email, password, portal: "client", redirect: false });
  redirect("/cliente?bemvindo=1");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  if (!rateLimit(`forgot:${await clientIp()}`, 5, 15 * 60_000).allowed) {
    return { ok: false, code: "TOO_MANY_ATTEMPTS", error: ERROR_MESSAGES.TOO_MANY_ATTEMPTS };
  }
  return runAction(() => requestPasswordReset(input), {
    message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
  });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const result = await runAction(() => resetPassword(input));
  if (!result.ok) return result;
  redirect("/entrar?redefinida=1");
}

