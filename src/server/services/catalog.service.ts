/** Serviços oferecidos pela barbearia (corte, barba...). */
import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import type { SessionUser } from "@/types/auth";
import { idSchema } from "@/validations/common";
import { serviceSchema, toggleActiveSchema } from "@/validations/catalog";

export interface ServiceDTO {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
}

const select = { id: true, name: true, description: true, priceCents: true, durationMinutes: true, active: true } as const;

/** Catálogo público: apenas serviços ativos. */
export function listActiveServices(): Promise<ServiceDTO[]> {
  return db.service.findMany({ where: { active: true }, select, orderBy: [{ priceCents: "asc" }, { name: "asc" }] });
}

export async function listAllServices(actor: SessionUser) {
  assertRole(actor, "ADMIN");
  const rows = await db.service.findMany({
    select: { ...select, _count: { select: { appointments: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(({ _count, ...s }) => ({ ...s, appointmentsCount: _count.appointments }));
}

function toData(input: unknown) {
  const d = serviceSchema.parse(input);
  return {
    name: d.name,
    description: d.description,
    priceCents: Math.round(d.price * 100),
    durationMinutes: d.durationMinutes,
    active: d.active,
  };
}

export async function createService(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  return db.service.create({ data: toData(input), select });
}

export async function updateService(actor: SessionUser, id: unknown, input: unknown) {
  assertRole(actor, "ADMIN");
  const serviceId = idSchema.parse(id);
  const exists = await db.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!exists) throw new AppError("NOT_FOUND");
  // Agendamentos existentes mantêm preço/horário originais (snapshot).
  return db.service.update({ where: { id: serviceId }, data: toData(input), select });
}

export async function setServiceActive(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  const { id, active } = toggleActiveSchema.parse(input);
  await db.service.update({ where: { id }, data: { active } });
}

/** Exclusão definitiva apenas para serviços nunca utilizados (preserva o histórico). */
export async function deleteService(actor: SessionUser, id: unknown) {
  assertRole(actor, "ADMIN");
  const serviceId = idSchema.parse(id);
  const used = await db.appointment.count({ where: { serviceId } });
  if (used > 0) throw new AppError("SERVICE_IN_USE");
  await db.service.delete({ where: { id: serviceId } });
}
