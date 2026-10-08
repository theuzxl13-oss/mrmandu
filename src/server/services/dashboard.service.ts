import { addDaysToKey, shopDateTimeToUtc, shopDayRangeUtc, todayKey, type DateKey } from "@/lib/time";
import { db } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import type { SessionUser } from "@/types/auth";
import { appointmentInclude, toAppointmentDTO, type AppointmentDTO } from "./appointment.service";

export interface DailyPoint {
  date: DateKey;
  appointments: number;
  revenueCents: number;
}

export interface AdminDashboard {
  todayCount: number;
  clientsCount: number;
  completedMonth: number;
  revenueMonthCents: number;
  pendingCount: number;
  last7Days: DailyPoint[];
  today: AppointmentDTO[];
}

function monthRange(now: Date) {
  const key = todayKey(now);
  const first = `${key.slice(0, 7)}-01`;
  const [y, m] = first.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { start: shopDateTimeToUtc(first, "00:00"), end: shopDateTimeToUtc(next, "00:00") };
}

export async function getAdminDashboard(actor: SessionUser, now = new Date()): Promise<AdminDashboard> {
  assertRole(actor, "ADMIN");
  const today = todayKey(now);
  const { start: dayStart, end: dayEnd } = shopDayRangeUtc(today);
  const month = monthRange(now);
  const weekStart = shopDayRangeUtc(addDaysToKey(today, -6)).start;

  const [todayRows, clientsCount, completedAgg, pendingCount, weekRows] = await Promise.all([
    db.appointment.findMany({
      where: { startTime: { gte: dayStart, lt: dayEnd } },
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    }),
    db.user.count({ where: { role: "CLIENT", active: true } }),
    db.appointment.aggregate({
      where: { status: "COMPLETED", startTime: { gte: month.start, lt: month.end } },
      _count: { _all: true },
      _sum: { priceCents: true },
    }),
    db.appointment.count({ where: { status: "PENDING", startTime: { gte: now } } }),
    db.appointment.findMany({
      where: { startTime: { gte: weekStart, lt: dayEnd }, status: { not: "CANCELLED" } },
      select: { date: true, status: true, priceCents: true },
    }),
  ]);

  const last7Days: DailyPoint[] = Array.from({ length: 7 }, (_, i) => ({
    date: addDaysToKey(today, i - 6),
    appointments: 0,
    revenueCents: 0,
  }));
  for (const row of weekRows) {
    const point = last7Days.find((p) => p.date === row.date.toISOString().slice(0, 10));
    if (!point) continue;
    point.appointments += 1;
    if (row.status === "COMPLETED") point.revenueCents += row.priceCents;
  }

  return {
    todayCount: todayRows.filter((a) => a.status !== "CANCELLED").length,
    clientsCount,
    completedMonth: completedAgg._count._all,
    revenueMonthCents: completedAgg._sum.priceCents ?? 0,
    pendingCount,
    last7Days,
    today: todayRows.map(toAppointmentDTO),
  };
}

export interface BarberDashboard {
  todayCount: number;
  next: AppointmentDTO | null;
  totalCompleted: number;
  pendingCount: number;
}

export async function getBarberDashboard(actor: SessionUser, now = new Date()): Promise<BarberDashboard> {
  assertRole(actor, "BARBER");
  const barberId = actor.barberId ?? "";
  const { start, end } = shopDayRangeUtc(todayKey(now));
  const [todayCount, next, totalCompleted, pendingCount] = await Promise.all([
    db.appointment.count({ where: { barberId, startTime: { gte: start, lt: end }, status: { not: "CANCELLED" } } }),
    db.appointment.findFirst({
      where: { barberId, status: { in: ["PENDING", "CONFIRMED"] }, endTime: { gt: now } },
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    }),
    db.appointment.count({ where: { barberId, status: "COMPLETED" } }),
    db.appointment.count({ where: { barberId, status: "PENDING", startTime: { gte: now } } }),
  ]);
  return { todayCount, next: next ? toAppointmentDTO(next) : null, totalCompleted, pendingCount };
}
