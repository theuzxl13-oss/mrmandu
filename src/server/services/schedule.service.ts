import { AppError } from "@/lib/errors";
import { addDaysToKey, dayOfWeekOf, minutesToTime, shopDayRangeUtc, timeToMinutes, type DateKey, type TimeKey } from "@/lib/time";
import { db } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import { workingIntervals, type Interval } from "@/server/scheduling/slots";
import type { SessionUser } from "@/types/auth";
import { listDayAppointments, type AppointmentDTO } from "./appointment.service";
import { getHoursForDay } from "./business-hours.service";
import { getShopSettings } from "./settings.service";

export type TimelineItem =
  | { kind: "free"; time: TimeKey }
  | { kind: "appointment"; time: TimeKey; appointment: AppointmentDTO };

export interface BarberDaySchedule {
  barberId: string;
  barberName: string;
  closed: boolean;
  items: TimelineItem[];
  cancelled: AppointmentDTO[];
}

/** Monta a linha do tempo do dia: horários livres + atendimentos. */
export function buildTimeline(intervals: Interval[], step: number, appointments: AppointmentDTO[]): TimelineItem[] {
  const active = appointments.filter((a) => a.status !== "CANCELLED");
  const busy = active.map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) || 24 * 60 }));
  const items: TimelineItem[] = active.map((a) => ({ kind: "appointment", time: a.startTime, appointment: a }));
  for (const iv of intervals) {
    for (let t = iv.start; t < iv.end; t += step) {
      const slot = { start: t, end: Math.min(t + step, iv.end) };
      if (!busy.some((b) => slot.start < b.end && b.start < slot.end)) items.push({ kind: "free", time: minutesToTime(t) });
    }
  }
  return items.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

/**
 * Agenda diária. BARBEIRO: sempre a própria. ADMIN: um barbeiro específico ou todos os ativos.
 */
export async function getDaySchedules(actor: SessionUser, date: DateKey, barberId?: string): Promise<BarberDaySchedule[]> {
  assertRole(actor, "BARBER", "ADMIN");
  if (actor.role === "BARBER") {
    if (!actor.barberId || (barberId && barberId !== actor.barberId)) throw new AppError("FORBIDDEN");
    barberId = actor.barberId;
  }
  const barbers = await db.barber.findMany({
    where: barberId ? { id: barberId } : { active: true },
    select: { id: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const ids = barbers.map((b) => b.id);
  const [settings, hours, appointments] = await Promise.all([
    getShopSettings(),
    getHoursForDay(db, dayOfWeekOf(date), ids),
    listDayAppointments(actor, date, barberId),
  ]);
  return barbers.map((b) => {
    const intervals = workingIntervals(hours.shop, hours.byBarber.get(b.id) ?? null);
    const own = appointments.filter((a) => a.barber.id === b.id);
    return {
      barberId: b.id,
      barberName: b.user.name,
      closed: intervals.length === 0,
      items: buildTimeline(intervals, settings.slotIntervalMinutes, own),
      cancelled: own.filter((a) => a.status === "CANCELLED"),
    };
  });
}

export interface DaySummary {
  date: DateKey;
  count: number;
}

/** Quantidade de atendimentos (não cancelados) por dia em uma janela, para um barbeiro. */
export async function getWeekSummary(actor: SessionUser, barberId: string, startDate: DateKey, days = 7): Promise<DaySummary[]> {
  assertRole(actor, "BARBER", "ADMIN");
  if (actor.role === "BARBER" && barberId !== actor.barberId) throw new AppError("FORBIDDEN");
  const keys = Array.from({ length: days }, (_, i) => addDaysToKey(startDate, i));
  const rows = await db.appointment.findMany({
    where: {
      barberId,
      status: { not: "CANCELLED" },
      startTime: { gte: shopDayRangeUtc(keys[0]!).start, lt: shopDayRangeUtc(keys[keys.length - 1]!).end },
    },
    select: { date: true },
  });
  return keys.map((date) => ({ date, count: rows.filter((r) => r.date.toISOString().slice(0, 10) === date).length }));
}
