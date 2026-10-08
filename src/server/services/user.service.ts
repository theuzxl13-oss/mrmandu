import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/server/auth/password";
import { assertRole } from "@/server/auth/permissions";
import type { LoginPortal, SessionUser, UserRole } from "@/types/auth";
import { changePasswordSchema, loginSchema, profileSchema, registerSchema } from "@/validations/auth";

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const PORTAL_ROLES: Record<LoginPortal, readonly UserRole[]> = {
  client: ["CLIENT"],
  staff: ["BARBER", "ADMIN"],
};

/** Cadastro público: sempre cria um CLIENTE (o perfil nunca vem do formulário). */
export async function registerClient(input: unknown) {
  const data = registerSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  try {
    return await db.user.create({
      data: { name: data.name, email: data.email, phone: data.phone, passwordHash, role: "CLIENT" },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("EMAIL_IN_USE");
    throw error;
  }
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
}

/**
 * Valida credenciais. Mensagem genérica para e-mail inexistente ou senha errada
 * (evita enumeração de contas) e tempo de resposta equalizado.
 */
export async function authenticate(input: unknown): Promise<AuthenticatedUser> {
  const { email, password, portal } = loginSchema.parse(input);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await burnPasswordCheck(password);
    throw new AppError("INVALID_CREDENTIALS");
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError("INVALID_CREDENTIALS");
  if (!user.active) throw new AppError("ACCOUNT_DISABLED");
  if (!PORTAL_ROLES[portal].includes(user.role)) throw new AppError("WRONG_PORTAL");
  if (user.role === "BARBER") {
    const barber = await db.barber.findUnique({ where: { userId: user.id }, select: { active: true } });
    if (!barber?.active) throw new AppError("ACCOUNT_DISABLED");
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
}

/**
 * Revalida o usuário da sessão no banco a cada requisição protegida:
 * conta ativa, perfil atual e versão de sessão (invalidada ao trocar senha).
 */
export async function loadSessionUser(id: string, sessionVersion: number): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      sessionVersion: true,
      barber: { select: { id: true, active: true } },
    },
  });
  if (!user || !user.active || user.sessionVersion !== sessionVersion) return null;
  if (user.role === "BARBER" && !user.barber?.active) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    barberId: user.role === "BARBER" ? (user.barber?.id ?? null) : null,
  };
}

export async function getProfile(actor: SessionUser) {
  assertRole(actor);
  return db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
}

export async function updateProfile(actor: SessionUser, input: unknown) {
  assertRole(actor);
  const data = profileSchema.parse(input);
  return db.user.update({
    where: { id: actor.id },
    data: { name: data.name, phone: data.phone },
    select: { id: true, name: true, phone: true },
  });
}

/** Troca de senha: exige a senha atual e invalida as demais sessões. */
export async function changePassword(actor: SessionUser, input: unknown) {
  assertRole(actor);
  const data = changePasswordSchema.parse(input);
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  if (!(await verifyPassword(data.currentPassword, user.passwordHash))) throw new AppError("WRONG_PASSWORD");
  const updated = await db.user.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(data.newPassword), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return updated;
}
