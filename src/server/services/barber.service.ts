import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { assertRole } from "@/server/auth/permissions";
import type { SessionUser } from "@/types/auth";
import { idSchema } from "@/validations/common";
import { createBarberSchema, toggleActiveSchema, updateBarberSchema } from "@/validations/catalog";
import { isUniqueViolation } from "./user.service";

export interface PublicBarberDTO {
  id: string;
  name: string;
  photo: string | null;
  specialty: string | null;
  bio: string | null;
}

/** Barbeiros visíveis ao público (sem e-mail/telefone). */
export async function listActiveBarbers(): Promise<PublicBarberDTO[]> {
  const rows = await db.barber.findMany({
    where: { active: true, user: { active: true } },
    select: { id: true, photo: true, specialty: true, bio: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return rows.map((b) => ({ id: b.id, name: b.user.name, photo: b.photo, specialty: b.specialty, bio: b.bio }));
}

export interface AdminBarberDTO extends PublicBarberDTO {
  userId: string;
  email: string;
  phone: string | null;
  active: boolean;
  hasCustomHours: boolean;
  upcomingCount: number;
}

export async function listAllBarbers(actor: SessionUser): Promise<AdminBarberDTO[]> {
  assertRole(actor, "ADMIN");
  const rows = await db.barber.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      _count: {
        select: {
          businessHours: true,
          appointments: { where: { status: { in: ["PENDING", "CONFIRMED"] }, startTime: { gte: new Date() } } },
        },
      },
    },
    orderBy: [{ active: "desc" }, { user: { name: "asc" } }],
  });
  return rows.map((b) => ({
    id: b.id,
    userId: b.userId,
    name: b.user.name,
    email: b.user.email,
    phone: b.user.phone,
    photo: b.photo,
    specialty: b.specialty,
    bio: b.bio,
    active: b.active,
    hasCustomHours: b._count.businessHours > 0,
    upcomingCount: b._count.appointments,
  }));
}

/** Cria usuário com perfil BARBER + registro de barbeiro (atomicamente). */
export async function createBarber(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  const d = createBarberSchema.parse(input);
  const passwordHash = await hashPassword(d.password);
  try {
    return await db.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        passwordHash,
        role: "BARBER",
        barber: { create: { photo: d.photo, specialty: d.specialty, bio: d.bio, active: d.active } },
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("EMAIL_IN_USE");
    throw error;
  }
}

export async function updateBarber(actor: SessionUser, id: unknown, input: unknown) {
  assertRole(actor, "ADMIN");
  const barberId = idSchema.parse(id);
  const d = updateBarberSchema.parse(input);
  const barber = await db.barber.findUnique({ where: { id: barberId }, select: { userId: true } });
  if (!barber) throw new AppError("NOT_FOUND");
  try {
    await db.user.update({
      where: { id: barber.userId },
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        ...(d.password ? { passwordHash: await hashPassword(d.password), sessionVersion: { increment: 1 } } : {}),
        barber: { update: { photo: d.photo, specialty: d.specialty, bio: d.bio, active: d.active } },
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("EMAIL_IN_USE");
    throw error;
  }
}

/**
 * Desativar impede novos agendamentos e o login do barbeiro.
 * Agendamentos já existentes são mantidos para que o admin possa reagendá-los.
 */
export async function setBarberActive(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  const { id, active } = toggleActiveSchema.parse(input);
  await db.barber.update({ where: { id }, data: { active } });
}

export async function listBarberOptions(actor: SessionUser) {
  assertRole(actor, "ADMIN");
  const rows = await db.barber.findMany({
    select: { id: true, active: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return rows.map((b) => ({ id: b.id, name: b.user.name, active: b.active }));
}
