import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { SHOP_TIMEZONE } from "@/config/shop";

/**
 * Convenções:
 * - DateKey: "YYYY-MM-DD" (data local da barbearia)
 * - TimeKey: "HH:mm"     (hora local da barbearia)
 * - Instantes (Date) são sempre UTC.
 */
export type DateKey = string;
export type TimeKey = string;

export const DATE_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_KEY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinutes(time: TimeKey): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): TimeKey {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Converte data+hora locais da barbearia para um instante UTC. */
export function shopDateTimeToUtc(date: DateKey, time: TimeKey, tz = SHOP_TIMEZONE): Date {
  return fromZonedTime(`${date}T${time}:00`, tz);
}

export function toShopDateKey(instant: Date, tz = SHOP_TIMEZONE): DateKey {
  return formatInTimeZone(instant, tz, "yyyy-MM-dd");
}

export function toShopTimeKey(instant: Date, tz = SHOP_TIMEZONE): TimeKey {
  return formatInTimeZone(instant, tz, "HH:mm");
}

/** Minutos desde a meia-noite (horário local da barbearia). */
export function toShopMinutes(instant: Date, tz = SHOP_TIMEZONE): number {
  return timeToMinutes(toShopTimeKey(instant, tz));
}

export function todayKey(now: Date = new Date(), tz = SHOP_TIMEZONE): DateKey {
  return toShopDateKey(now, tz);
}

/** Dia da semana (0 = domingo) de uma data local — independente de fuso. */
export function dayOfWeekOf(date: DateKey): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDaysToKey(date: DateKey, days: number): DateKey {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Valor para colunas @db.Date (meia-noite UTC da data local). */
export function dateKeyToDbDate(date: DateKey): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function dbDateToKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_REGEX.test(value)) return false;
  return new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Intervalo UTC [início, fim) que cobre um dia local inteiro. */
export function shopDayRangeUtc(date: DateKey, tz = SHOP_TIMEZONE): { start: Date; end: Date } {
  return {
    start: shopDateTimeToUtc(date, "00:00", tz),
    end: shopDateTimeToUtc(addDaysToKey(date, 1), "00:00", tz),
  };
}
