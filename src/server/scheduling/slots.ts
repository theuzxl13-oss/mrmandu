/**
 * Regras puras de disponibilidade (sem I/O) — fáceis de testar e reutilizadas
 * tanto na listagem de horários quanto na validação de um agendamento.
 * Todos os valores são minutos desde a meia-noite (horário local da barbearia).
 */
import { minutesToTime, timeToMinutes, type TimeKey } from "@/lib/time";

export interface DayHours {
  startTime: TimeKey;
  endTime: TimeKey;
  breakStart: TimeKey | null;
  breakEnd: TimeKey | null;
  active: boolean;
}

export interface Interval {
  start: number;
  end: number;
}

export interface Slot {
  time: TimeKey;
  available: boolean;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function subtract(intervals: Interval[], cut: Interval): Interval[] {
  return intervals.flatMap((iv) => {
    if (!overlaps(iv, cut)) return [iv];
    const parts: Interval[] = [];
    if (cut.start > iv.start) parts.push({ start: iv.start, end: cut.start });
    if (cut.end < iv.end) parts.push({ start: cut.end, end: iv.end });
    return parts;
  });
}

function breakOf(hours: DayHours): Interval | null {
  if (!hours.breakStart || !hours.breakEnd) return null;
  const start = timeToMinutes(hours.breakStart);
  const end = timeToMinutes(hours.breakEnd);
  return end > start ? { start, end } : null;
}

/**
 * Intervalos de trabalho efetivos de um barbeiro em um dia:
 * horário da barbearia ∩ jornada do barbeiro (se houver), menos os intervalos.
 */
export function workingIntervals(shop: DayHours | null, barber: DayHours | null): Interval[] {
  if (!shop || !shop.active) return [];
  if (barber && !barber.active) return [];

  let start = timeToMinutes(shop.startTime);
  let end = timeToMinutes(shop.endTime);
  if (barber) {
    start = Math.max(start, timeToMinutes(barber.startTime));
    end = Math.min(end, timeToMinutes(barber.endTime));
  }
  if (end <= start) return [];

  let result: Interval[] = [{ start, end }];
  for (const br of [breakOf(shop), barber ? breakOf(barber) : null]) {
    if (br) result = subtract(result, br);
  }
  return result;
}

export function fitsWorkingIntervals(slot: Interval, intervals: Interval[]): boolean {
  return intervals.some((iv) => slot.start >= iv.start && slot.end <= iv.end);
}

export interface SlotGridInput {
  intervals: Interval[];
  durationMinutes: number;
  slotIntervalMinutes: number;
  busy: Interval[];
  /** Primeiro minuto permitido para início (considera antecedência mínima). */
  earliestStart: number;
}

/** Grade de horários do dia com indicação de disponibilidade. */
export function buildSlotGrid(input: SlotGridInput): Slot[] {
  const { intervals, durationMinutes, slotIntervalMinutes, busy, earliestStart } = input;
  const slots: Slot[] = [];
  for (const iv of intervals) {
    for (let start = iv.start; start + durationMinutes <= iv.end; start += slotIntervalMinutes) {
      const candidate = { start, end: start + durationMinutes };
      const available = start >= earliestStart && !busy.some((b) => overlaps(candidate, b));
      slots.push({ time: minutesToTime(start), available });
    }
  }
  return slots;
}

/** Combina grades de vários barbeiros ("qualquer barbeiro disponível"). */
export function mergeSlotGrids(grids: Slot[][]): Slot[] {
  const map = new Map<TimeKey, boolean>();
  for (const grid of grids) {
    for (const slot of grid) map.set(slot.time, (map.get(slot.time) ?? false) || slot.available);
  }
  return [...map.entries()]
    .sort(([a], [b]) => timeToMinutes(a) - timeToMinutes(b))
    .map(([time, available]) => ({ time, available }));
}
