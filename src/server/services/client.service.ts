import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import type { SessionUser } from "@/types/auth";
import { idSchema } from "@/validations/common";
import { toggleActiveSchema } from "@/validations/catalog";
import { appointmentInclude, toAppointmentDTO } from "./appointment.service";

export interface ClientRowDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  appointmentsCount: number;
  lastVisit: string | null;
  createdAt: string;
}

export async function listClients(actor: SessionUser, opts: { q?: string; page?: number } = {}) {
  assertRole(actor, "ADMIN");
  const pageSize = 25;
  const page = opts.page ?? 1;
  const where: Prisma.UserWhereInput = { role: "CLIENT" };
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: "insensitive" } },
      { email: { contains: opts.q, mode: "insensitive" } },
      ...(opts.q.replace(/\D/g, "") ? [{ phone: { contains: opts.q.replace(/\D/g, "") } }] : []),
    ];
  }
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        _count: { select: { appointments: true } },
        appointments: {
          where: { status: "COMPLETED" },
          orderBy: { startTime: "desc" },
          take: 1,
          select: { startTime: true },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const items: ClientRowDTO[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    active: u.active,
    appointmentsCount: u._count.appointments,
    lastVisit: u.appointments[0]?.startTime.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getClientDetail(actor: SessionUser, id: unknown) {
  assertRole(actor, "ADMIN");
  const clientId = idSchema.parse(id);
  const user = await db.user.findFirst({
    where: { id: clientId, role: "CLIENT" },
    select: { id: true, name: true, email: true, phone: true, active: true, createdAt: true },
  });
  if (!user) throw new AppError("NOT_FOUND");
  const stats = await db.appointment.groupBy({
    by: ["status"],
    where: { clientId },
    _count: { _all: true },
    _sum: { priceCents: true },
  });
  const history = await db.appointment.findMany({
    where: { clientId },
    include: appointmentInclude,
    orderBy: { startTime: "desc" },
    take: 100,
  });
  return { ...user, createdAt: user.createdAt.toISOString(), stats, history: history.map(toAppointmentDTO) };
}

/** Desativar bloqueia login e invalida sessões ativas do cliente. */
export async function setClientActive(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  const { id, active } = toggleActiveSchema.parse(input);
  const { count } = await db.user.updateMany({
    where: { id, role: "CLIENT" },
    data: { active, ...(active ? {} : { sessionVersion: { increment: 1 } }) },
  });
  if (count === 0) throw new AppError("NOT_FOUND");
}

export async function listClientOptions(actor: SessionUser) {
  assertRole(actor, "ADMIN");
  return db.user.findMany({
    where: { role: "CLIENT", active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 1000,
  });
}
