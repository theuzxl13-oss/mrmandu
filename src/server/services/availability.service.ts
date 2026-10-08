import type { ShopSettings } from "@prisma/client";
import { AppError } from "@/lib/errors";
import {
  addDaysToKey,
  dayOfWeekOf,
  shopDayRangeUtc,
  toShopDateKey,
  toShopMinutes,
  todayKey,
  type DateKey,
} from "@/lib/time";
import { db, type TxClient } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import {
  buildSlotGrid,
  mergeSlotGrids,
  workingIntervals,
  type Interval,
  type Slot,
} from "@/server/scheduling/slots";
import { getHoursForDay } from "./business-hours.service";
import { getShopSettings } from "./settings.service";
import type { SessionUser } from "@/types/auth";
import { ANY_BARBER, availabilityQuerySchema } from "@/validations/appointment";

/** Status que ocupam a agenda (os mesmos da exclusion constraint do banco). */
export const BLOCKING_STATUSES = ["PENDING", "CONFIRMED"] as const;

type Client = TxClient | typeof db;

export interface BookingPolicy {
  /** Clientes respeitam antecedência mínima e janela máxima; equipe apenas "não no passado". */
  enforceClientRules: boolean;
}

export function policyFor(actor: SessionUser): BookingPolicy {
  return { enforceClientRules: actor.role === "CLIENT" };
}

/**
 * Primeiro minuto (local) permitido para início em uma data.
 * -Infinity => qualquer horário; +Infinity => nenhum horário (data no passado).
 */
export function earliestStartFor(date: DateKey, now: Date, minAdvanceMinutes: number): number {
  const limit = new Date(now.getTime() + minAdvanceMinutes * 60_000);
  const limitKey = toShopDateKey(limit);
  if (date < limitKey) return Number.POSITIVE_INFINITY;
  if (date > limitKey) return Number.NEGATIVE_INFINITY;
  return toShopMinutes(limit) + (limit.getSeconds() > 0 || limit.getMilliseconds() > 0 ? 1 : 0);
}

export function assertDateWithinWindow(date: DateKey, settings: ShopSettings, policy: BookingPolicy, now: Date) {
  if (date < todayKey(now)) throw new AppError("SLOT_IN_PAST");
  if (policy.enforceClientRules && date > addDaysToKey(todayKey(now), settings.maxAdvanceDays)) {
    throw new AppError("TOO_FAR_AHEAD");
  }
}

/** Intervalos ocupados (em minutos locais) de cada barbeiro no dia. */
export async function busyIntervalsByBarber(
  client: Client,
  date: DateKey,
  barberIds: string[],
  excludeAppointmentId?: string,
): Promise<Map<string, Interval[]>> {
  const { start, end } = shopDayRangeUtc(date);
  const rows = await client.appointment.findMany({
    where: {
      barberId: { in: barberIds },
      status: { in: [...BLOCKING_STATUSES] },
      startTime: { lt: end },
      endTime: { gt: start },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { barberId: true, startTime: true, endTime: true },
  });
  const map = new Map<string, Interval[]>();
  for (const r of rows) {
    const startMin = r.startTime < start ? 0 : toShopMinutes(r.startTime);
    const endMin = r.endTime >= end ? 24 * 60 : toShopMinutes(r.endTime);
    const list = map.get(r.barberId) ?? [];
    list.push({ start: startMin, end: endMin });
    map.set(r.barberId, list);
  }
  return map;
}

export interface BarberDayContext {
  barberId: string;
  intervals: Interval[];
  busy: Interval[];
}

/** Carrega tudo o que é necessário para calcular a agenda de barbeiros em um dia. */
export async function loadDayContext(
  client: Client,
  date: DateKey,
  barberIds: string[],
  excludeAppointmentId?: string,
): Promise<BarberDayContext[]> {
  const [{ shop, byBarber }, busy] = await Promise.all([
    getHoursForDay(client, dayOfWeekOf(date), barberIds),
    busyIntervalsByBarber(client, date, barberIds, excludeAppointmentId),
  ]);
  return barberIds.map((barberId) => ({
    barberId,
    intervals: workingIntervals(shop, byBarber.get(barberId) ?? null),
    busy: busy.get(barberId) ?? [],
  }));
}

export interface AvailabilityResult {
  slots: Slot[];
  /** true quando não há expediente no dia (fechado / folga). */
  closed: boolean;
}

interface ComputeOptions {
  date: DateKey;
  durationMinutes: number;
  barberIds: string[];
  settings: ShopSettings;
  policy: BookingPolicy;
  now?: Date;
  excludeAppointmentId?: string;
}

export async function computeAvailability(opts: ComputeOptions): Promise<AvailabilityResult> {
  const now = opts.now ?? new Date();
  if (opts.date < todayKey(now)) return { slots: [], closed: false };
  if (
    opts.policy.enforceClientRules &&
    opts.date > addDaysToKey(todayKey(now), opts.settings.maxAdvanceDays)
  ) {
    return { slots: [], closed: false };
  }
  const contexts = await loadDayContext(db, opts.date, opts.barberIds, opts.excludeAppointmentId);
  const earliestStart = earliestStartFor(
    opts.date,
    now,
    opts.policy.enforceClientRules ? opts.settings.minAdvanceMinutes : 0,
  );
  const grids = contexts.map((ctx) =>
    buildSlotGrid({
      intervals: ctx.intervals,
      durationMinutes: opts.durationMinutes,
      slotIntervalMinutes: opts.settings.slotIntervalMinutes,
      busy: ctx.busy,
      earliestStart,
    }),
  );
  return {
    slots: mergeSlotGrids(grids),
    closed: contexts.every((c) => c.intervals.length === 0),
  };
}

/** Horários disponíveis para o fluxo de agendamento (serviço + barbeiro|qualquer + data). */
export async function getAvailability(actor: SessionUser, input: unknown, now = new Date()): Promise<AvailabilityResult> {
  assertRole(actor, "CLIENT", "ADMIN");
  const query = availabilityQuerySchema.parse(input);

  const [service, settings] = await Promise.all([
    db.service.findUnique({ where: { id: query.serviceId } }),
    getShopSettings(),
  ]);
  if (!service || !service.active) throw new AppError("SERVICE_INACTIVE");

  let barberIds: string[];
  if (query.barberId === ANY_BARBER) {
    const barbers = await db.barber.findMany({ where: { active: true, user: { active: true } }, select: { id: true } });
    barberIds = barbers.map((b) => b.id);
  } else {
    const barber = await db.barber.findUnique({ where: { id: query.barberId }, include: { user: { select: { active: true } } } });
    if (!barber || !barber.active || !barber.user.active) throw new AppError("BARBER_UNAVAILABLE");
    barberIds = [barber.id];
  }
  if (!barberIds.length) return { slots: [], closed: true };

  return computeAvailability({
    date: query.date,
    durationMinutes: service.durationMinutes,
    barberIds,
    settings,
    policy: policyFor(actor),
    now,
  });
}
