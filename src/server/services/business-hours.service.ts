import type { BusinessHours } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { db, type TxClient } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import type { DayHours } from "@/server/scheduling/slots";
import type { SessionUser } from "@/types/auth";
import { weeklyHoursSchema } from "@/validations/catalog";

export interface WeeklyDayHours extends DayHours {
  dayOfWeek: number;
}

const DEFAULT_DAY: Omit<WeeklyDayHours, "dayOfWeek"> = {
  startTime: "09:00",
  endTime: "19:00",
  breakStart: "12:00",
  breakEnd: "13:00",
  active: false,
};

export function toDayHours(row: Pick<BusinessHours, "startTime" | "endTime" | "breakStart" | "breakEnd" | "active">): DayHours {
  return {
    startTime: row.startTime,
    endTime: row.endTime,
    breakStart: row.breakStart,
    breakEnd: row.breakEnd,
    active: row.active,
  };
}

/** Semana completa (7 dias) — dias sem registro aparecem como fechados. */
export async function getWeeklyHours(barberId: string | null): Promise<{ days: WeeklyDayHours[]; customized: boolean }> {
  const rows = await db.businessHours.findMany({ where: { barberId } });
  const days = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const row = rows.find((r) => r.dayOfWeek === dayOfWeek);
    return row ? { dayOfWeek, ...toDayHours(row) } : { dayOfWeek, ...DEFAULT_DAY };
  });
  return { days, customized: rows.length > 0 };
}

/** Horários de um dia: geral da barbearia + jornadas específicas dos barbeiros. */
export async function getHoursForDay(client: TxClient | typeof db, dayOfWeek: number, barberIds: string[]) {
  const rows = await client.businessHours.findMany({
    where: { dayOfWeek, OR: [{ barberId: null }, { barberId: { in: barberIds } }] },
  });
  const shopRow = rows.find((r) => r.barberId === null);
  const byBarber = new Map<string, DayHours>();
  for (const r of rows) if (r.barberId) byBarber.set(r.barberId, toDayHours(r));
  return { shop: shopRow ? toDayHours(shopRow) : null, byBarber };
}

export async function saveWeeklyHours(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  const { barberId, days } = weeklyHoursSchema.parse(input);
  if (barberId) {
    const barber = await db.barber.findUnique({ where: { id: barberId }, select: { id: true } });
    if (!barber) throw new AppError("NOT_FOUND");
  }
  await db.$transaction(async (tx) => {
    for (const day of days) {
      const data = {
        startTime: day.startTime,
        endTime: day.endTime,
        breakStart: day.breakStart,
        breakEnd: day.breakEnd,
        active: day.active,
      };
      const existing = await tx.businessHours.findFirst({ where: { barberId, dayOfWeek: day.dayOfWeek } });
      if (existing) await tx.businessHours.update({ where: { id: existing.id }, data });
      else await tx.businessHours.create({ data: { ...data, barberId, dayOfWeek: day.dayOfWeek } });
    }
  });
}

/** Remove a jornada específica — o barbeiro volta a seguir o horário geral. */
export async function clearBarberHours(actor: SessionUser, barberId: string) {
  assertRole(actor, "ADMIN");
  await db.businessHours.deleteMany({ where: { barberId } });
}
