import { Prisma, type AppointmentStatus } from "@prisma/client";
import { AppError, isAppError } from "@/lib/errors";
import {
  dateKeyToDbDate,
  dbDateToKey,
  shopDateTimeToUtc,
  shopDayRangeUtc,
  timeToMinutes,
  toShopTimeKey,
  type DateKey,
  type TimeKey,
} from "@/lib/time";
import { db, type TxClient } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import { fitsWorkingIntervals, overlaps } from "@/server/scheduling/slots";
import {
  assertDateWithinWindow,
  BLOCKING_STATUSES,
  computeAvailability,
  earliestStartFor,
  loadDayContext,
  policyFor,
  type AvailabilityResult,
  type BookingPolicy,
} from "./availability.service";
import { getShopSettings } from "./settings.service";
import type { SessionUser } from "@/types/auth";
import {
  adminCreateAppointmentSchema,
  ANY_BARBER,
  cancelSchema,
  createAppointmentSchema,
  rescheduleSchema,
  rescheduleSlotsQuerySchema,
  updateNotesSchema,
  type AppointmentFilters,
} from "@/validations/appointment";
import { idSchema } from "@/validations/common";

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

export const appointmentInclude = {
  service: { select: { id: true, name: true, durationMinutes: true } },
  barber: { select: { id: true, photo: true, user: { select: { name: true } } } },
  client: { select: { id: true, name: true, phone: true, email: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export interface AppointmentDTO {
  id: string;
  status: AppointmentStatus;
  date: DateKey;
  startTime: TimeKey;
  endTime: TimeKey;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  notes: string | null;
  cancellationReason: string | null;
  service: { id: string; name: string; durationMinutes: number };
  barber: { id: string; name: string; photo: string | null };
  client: { id: string; name: string; phone: string | null; email: string };
}

export function toAppointmentDTO(a: AppointmentWithRelations): AppointmentDTO {
  return {
    id: a.id,
    status: a.status,
    date: dbDateToKey(a.date),
    startTime: toShopTimeKey(a.startTime),
    endTime: toShopTimeKey(a.endTime),
    startsAt: a.startTime.toISOString(),
    endsAt: a.endTime.toISOString(),
    priceCents: a.priceCents,
    notes: a.notes,
    cancellationReason: a.cancellationReason,
    service: a.service,
    barber: { id: a.barber.id, name: a.barber.user.name, photo: a.barber.photo },
    client: a.client,
  };
}

// ---------------------------------------------------------------------------
// Regras de reserva (executadas dentro de transação + lock por barbeiro)
// ---------------------------------------------------------------------------

/** Detecta violação da exclusion constraint "appointment_no_overlap" (SQLSTATE 23P01). */
export function isOverlapViolation(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return /appointment_no_overlap|23P01|exclusion constraint/i.test(error.message);
  }
  return false;
}

/**
 * Serializa reservas concorrentes do MESMO barbeiro durante a transação.
 * A exclusion constraint continua sendo a garantia final caso algo escape.
 */
async function lockBarber(tx: TxClient, barberId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`barber:${barberId}`}))`;
}

interface SlotRequest {
  barberId: string;
  date: DateKey;
  time: TimeKey;
  durationMinutes: number;
  excludeAppointmentId?: string;
}

/** Valida (dentro da transação) que o horário pode ser reservado para o barbeiro. */
async function assertSlotBookable(
  tx: TxClient,
  req: SlotRequest,
  policy: BookingPolicy,
  now: Date,
): Promise<{ startTime: Date; endTime: Date }> {
  const settings = await getShopSettings(tx);
  assertDateWithinWindow(req.date, settings, policy, now);

  const barber = await tx.barber.findUnique({
    where: { id: req.barberId },
    select: { active: true, user: { select: { active: true } } },
  });
  if (!barber || !barber.active || !barber.user.active) throw new AppError("BARBER_UNAVAILABLE");

  const startTime = shopDateTimeToUtc(req.date, req.time);
  const endTime = new Date(startTime.getTime() + req.durationMinutes * 60_000);
  if (startTime.getTime() <= now.getTime()) throw new AppError("SLOT_IN_PAST");

  const startMin = timeToMinutes(req.time);
  const slot = { start: startMin, end: startMin + req.durationMinutes };
  const minAdvance = policy.enforceClientRules ? settings.minAdvanceMinutes : 0;
  if (slot.start < earliestStartFor(req.date, now, minAdvance)) throw new AppError("SLOT_IN_PAST");

  const [ctx] = await loadDayContext(tx, req.date, [req.barberId], req.excludeAppointmentId);
  if (!ctx || !fitsWorkingIntervals(slot, ctx.intervals)) throw new AppError("OUTSIDE_BUSINESS_HOURS");
  if (ctx.busy.some((b) => overlaps(slot, b))) throw new AppError("SLOT_UNAVAILABLE");

  return { startTime, endTime };
}

async function inBarberTransaction<T>(barberId: string, fn: (tx: TxClient) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(
      async (tx) => {
        await lockBarber(tx, barberId);
        return fn(tx);
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    if (isOverlapViolation(error)) throw new AppError("SLOT_UNAVAILABLE");
    throw error;
  }
}

/** Ordena barbeiros pelo menor número de atendimentos no dia (distribui a demanda). */
async function rankBarbersByLoad(date: DateKey): Promise<string[]> {
  const { start, end } = shopDayRangeUtc(date);
  const barbers = await db.barber.findMany({
    where: { active: true, user: { active: true } },
    select: {
      id: true,
      _count: {
        select: {
          appointments: { where: { status: { in: [...BLOCKING_STATUSES] }, startTime: { gte: start, lt: end } } },
        },
      },
    },
  });
  return barbers.sort((a, b) => a._count.appointments - b._count.appointments).map((b) => b.id);
}

// ---------------------------------------------------------------------------
// Casos de uso
// ---------------------------------------------------------------------------

/**
 * Cria um agendamento.
 * CLIENTE: sempre para si mesmo. ADMIN: em nome de um cliente (clientId).
 */
export async function createAppointment(actor: SessionUser, input: unknown, now = new Date()): Promise<AppointmentDTO> {
  assertRole(actor, "CLIENT", "ADMIN");
  let clientId: string;
  let data;
  if (actor.role === "ADMIN") {
    const parsed = adminCreateAppointmentSchema.parse(input);
    const client = await db.user.findUnique({ where: { id: parsed.clientId }, select: { role: true, active: true } });
    if (!client || client.role !== "CLIENT" || !client.active) throw new AppError("NOT_FOUND", "Cliente não encontrado ou inativo.");
    clientId = parsed.clientId;
    data = parsed;
  } else {
    data = createAppointmentSchema.parse(input);
    clientId = actor.id;
  }

  const service = await db.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) throw new AppError("SERVICE_INACTIVE");

  const policy = policyFor(actor);
  const candidates = data.barberId === ANY_BARBER ? await rankBarbersByLoad(data.date) : [data.barberId];
  if (!candidates.length) throw new AppError("NO_BARBER_AVAILABLE");

  let lastError: unknown = null;
  for (const barberId of candidates) {
    try {
      const created = await inBarberTransaction(barberId, async (tx) => {
        const { startTime, endTime } = await assertSlotBookable(
          tx,
          { barberId, date: data.date, time: data.time, durationMinutes: service.durationMinutes },
          policy,
          now,
        );
        return tx.appointment.create({
          data: {
            clientId,
            barberId,
            serviceId: service.id,
            date: dateKeyToDbDate(data.date),
            startTime,
            endTime,
            priceCents: service.priceCents,
            notes: data.notes,
            status: actor.role === "ADMIN" ? "CONFIRMED" : "PENDING",
          },
          include: appointmentInclude,
        });
      });
      return toAppointmentDTO(created);
    } catch (error) {
      // Com "qualquer barbeiro", tenta o próximo quando este não pode atender.
      const retryable =
        isAppError(error) && ["SLOT_UNAVAILABLE", "OUTSIDE_BUSINESS_HOURS", "BARBER_UNAVAILABLE"].includes(error.code);
      if (candidates.length > 1 && retryable) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (lastError) throw new AppError("NO_BARBER_AVAILABLE");
  throw new AppError("SLOT_UNAVAILABLE");
}

/** Carrega um agendamento verificando se o ator pode acessá-lo. */
async function loadAuthorized(actor: SessionUser, appointmentId: string): Promise<AppointmentWithRelations> {
  const appointment = await db.appointment.findUnique({ where: { id: appointmentId }, include: appointmentInclude });
  // NOT_FOUND também para registros de terceiros: não revela que o ID existe.
  if (!appointment || !canAccessAppointment(actor, appointment)) throw new AppError("NOT_FOUND");
  return appointment;
}

export function canAccessAppointment(actor: SessionUser, a: { clientId: string; barberId: string }): boolean {
  switch (actor.role) {
    case "ADMIN":
      return true;
    case "BARBER":
      return !!actor.barberId && a.barberId === actor.barberId;
    case "CLIENT":
      return a.clientId === actor.id;
  }
}

function assertClientNotice(actor: SessionUser, startTime: Date, noticeHours: number, now: Date) {
  if (actor.role !== "CLIENT") return;
  if (startTime.getTime() - now.getTime() < noticeHours * 3_600_000) throw new AppError("CANCELLATION_TOO_LATE");
}

export async function getAppointment(actor: SessionUser, appointmentId: unknown): Promise<AppointmentDTO> {
  assertRole(actor);
  return toAppointmentDTO(await loadAuthorized(actor, idSchema.parse(appointmentId)));
}

export async function cancelAppointment(actor: SessionUser, input: unknown, now = new Date()): Promise<void> {
  assertRole(actor);
  const { appointmentId, reason } = cancelSchema.parse(input);
  const appointment = await loadAuthorized(actor, appointmentId);
  if (!BLOCKING_STATUSES.includes(appointment.status as (typeof BLOCKING_STATUSES)[number])) {
    throw new AppError("INVALID_STATUS_TRANSITION");
  }
  if (actor.role === "CLIENT") {
    if (appointment.startTime <= now) throw new AppError("CANCELLATION_TOO_LATE");
    const settings = await getShopSettings();
    assertClientNotice(actor, appointment.startTime, settings.cancellationNoticeHours, now);
  }
  await transition(appointment.id, [...BLOCKING_STATUSES], {
    status: "CANCELLED",
    cancelledAt: now,
    cancellationReason: reason,
  });
}

export async function confirmAppointment(actor: SessionUser, appointmentId: unknown): Promise<void> {
  assertRole(actor, "BARBER", "ADMIN");
  const appointment = await loadAuthorized(actor, idSchema.parse(appointmentId));
  if (appointment.status !== "PENDING") throw new AppError("INVALID_STATUS_TRANSITION");
  await transition(appointment.id, ["PENDING"], { status: "CONFIRMED" });
}

export async function completeAppointment(actor: SessionUser, appointmentId: unknown, now = new Date()): Promise<void> {
  assertRole(actor, "BARBER", "ADMIN");
  const appointment = await loadAuthorized(actor, idSchema.parse(appointmentId));
  if (!BLOCKING_STATUSES.includes(appointment.status as (typeof BLOCKING_STATUSES)[number])) {
    throw new AppError("INVALID_STATUS_TRANSITION");
  }
  if (appointment.startTime > now) throw new AppError("CANNOT_COMPLETE_FUTURE");
  await transition(appointment.id, [...BLOCKING_STATUSES], { status: "COMPLETED" });
}

/** Transição de status atômica: só aplica se o status atual ainda for um dos esperados. */
async function transition(
  id: string,
  from: AppointmentStatus[],
  data: Prisma.AppointmentUpdateManyMutationInput,
): Promise<void> {
  const { count } = await db.appointment.updateMany({ where: { id, status: { in: from } }, data });
  if (count === 0) throw new AppError("INVALID_STATUS_TRANSITION");
}

export async function updateAppointmentNotes(actor: SessionUser, input: unknown): Promise<void> {
  assertRole(actor, "ADMIN", "BARBER");
  const { appointmentId, notes } = updateNotesSchema.parse(input);
  await loadAuthorized(actor, appointmentId);
  await db.appointment.update({ where: { id: appointmentId }, data: { notes } });
}

/**
 * Reagenda mantendo o serviço. Cliente/barbeiro mantêm o barbeiro;
 * apenas o administrador pode transferir para outro barbeiro.
 */
export async function rescheduleAppointment(actor: SessionUser, input: unknown, now = new Date()): Promise<AppointmentDTO> {
  assertRole(actor);
  const data = rescheduleSchema.parse(input);
  const appointment = await loadAuthorized(actor, data.appointmentId);
  if (!BLOCKING_STATUSES.includes(appointment.status as (typeof BLOCKING_STATUSES)[number])) {
    throw new AppError("INVALID_STATUS_TRANSITION");
  }
  if (data.barberId && data.barberId !== appointment.barberId && actor.role !== "ADMIN") {
    throw new AppError("FORBIDDEN");
  }
  if (actor.role === "CLIENT") {
    const settings = await getShopSettings();
    assertClientNotice(actor, appointment.startTime, settings.cancellationNoticeHours, now);
  }

  const barberId = data.barberId ?? appointment.barberId;
  const updated = await inBarberTransaction(barberId, async (tx) => {
    const { startTime, endTime } = await assertSlotBookable(
      tx,
      {
        barberId,
        date: data.date,
        time: data.time,
        durationMinutes: appointment.service.durationMinutes,
        excludeAppointmentId: appointment.id,
      },
      policyFor(actor),
      now,
    );
    const { count } = await tx.appointment.updateMany({
      where: { id: appointment.id, status: { in: [...BLOCKING_STATUSES] } },
      data: {
        barberId,
        date: dateKeyToDbDate(data.date),
        startTime,
        endTime,
        // Reagendamento feito pelo cliente volta a aguardar confirmação.
        status: actor.role === "CLIENT" ? "PENDING" : appointment.status,
      },
    });
    if (count === 0) throw new AppError("INVALID_STATUS_TRANSITION");
    return tx.appointment.findUniqueOrThrow({ where: { id: appointment.id }, include: appointmentInclude });
  });
  return toAppointmentDTO(updated);
}

/** Horários disponíveis para reagendar um agendamento existente. */
export async function getRescheduleSlots(actor: SessionUser, input: unknown, now = new Date()): Promise<AvailabilityResult> {
  assertRole(actor);
  const query = rescheduleSlotsQuerySchema.parse(input);
  const appointment = await loadAuthorized(actor, query.appointmentId);
  if (query.barberId && query.barberId !== appointment.barberId && actor.role !== "ADMIN") {
    throw new AppError("FORBIDDEN");
  }
  const barberId = query.barberId ?? appointment.barberId;
  const settings = await getShopSettings();
  return computeAvailability({
    date: query.date,
    durationMinutes: appointment.service.durationMinutes,
    barberIds: [barberId],
    settings,
    policy: policyFor(actor),
    now,
    excludeAppointmentId: appointment.id,
  });
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export interface ClientAppointments {
  upcoming: AppointmentDTO[];
  past: AppointmentDTO[];
  cancelled: AppointmentDTO[];
}

export async function listClientAppointments(actor: SessionUser, now = new Date()): Promise<ClientAppointments> {
  assertRole(actor, "CLIENT");
  const rows = await db.appointment.findMany({
    where: { clientId: actor.id },
    include: appointmentInclude,
    orderBy: { startTime: "asc" },
    take: 500,
  });
  const result: ClientAppointments = { upcoming: [], past: [], cancelled: [] };
  for (const row of rows) {
    const dto = toAppointmentDTO(row);
    if (row.status === "CANCELLED") result.cancelled.unshift(dto);
    else if (row.status !== "COMPLETED" && row.endTime > now) result.upcoming.push(dto);
    else result.past.unshift(dto);
  }
  return result;
}

/**
 * Agenda de um dia. BARBEIRO só pode consultar a própria agenda;
 * ADMIN pode consultar qualquer barbeiro (ou todos, sem barberId).
 */
export async function listDayAppointments(
  actor: SessionUser,
  date: DateKey,
  barberId?: string,
): Promise<AppointmentDTO[]> {
  assertRole(actor, "BARBER", "ADMIN");
  let filterBarber = barberId;
  if (actor.role === "BARBER") {
    if (barberId && barberId !== actor.barberId) throw new AppError("FORBIDDEN");
    if (!actor.barberId) throw new AppError("FORBIDDEN");
    filterBarber = actor.barberId;
  }
  const { start, end } = shopDayRangeUtc(date);
  const rows = await db.appointment.findMany({
    where: { startTime: { gte: start, lt: end }, ...(filterBarber ? { barberId: filterBarber } : {}) },
    include: appointmentInclude,
    orderBy: { startTime: "asc" },
  });
  return rows.map(toAppointmentDTO);
}

export const PAGE_SIZE = 20;

/** Listagem paginada com filtros. Barbeiros veem apenas os próprios atendimentos. */
export async function listAppointments(actor: SessionUser, filters: AppointmentFilters) {
  assertRole(actor, "BARBER", "ADMIN");
  const where: Prisma.AppointmentWhereInput = {};
  if (actor.role === "BARBER") {
    if (!actor.barberId) throw new AppError("FORBIDDEN");
    where.barberId = actor.barberId;
  } else if (filters.barberId) {
    where.barberId = filters.barberId;
  }
  if (filters.date) {
    const { start, end } = shopDayRangeUtc(filters.date);
    where.startTime = { gte: start, lt: end };
  }
  if (filters.serviceId) where.serviceId = filters.serviceId;
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.client = {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q.replace(/\D/g, "") || filters.q } },
      ],
    };
  }
  const page = filters.page ?? 1;
  const [total, rows] = await Promise.all([
    db.appointment.count({ where }),
    db.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startTime: filters.date ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { items: rows.map(toAppointmentDTO), total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
