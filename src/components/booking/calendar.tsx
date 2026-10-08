"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToKey, dayOfWeekOf, type DateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

interface CalendarProps {
  value: DateKey | null;
  onChange: (date: DateKey) => void;
  minDate: DateKey;
  maxDate?: DateKey;
  /** Dias da semana fechados (0 = domingo). */
  closedWeekdays?: number[];
}

function monthKey(date: DateKey) {
  return date.slice(0, 7);
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Calendário mensal acessível; datas são DateKeys (fuso da barbearia). */
export function Calendar({ value, onChange, minDate, maxDate, closedWeekdays = [] }: CalendarProps) {
  const [month, setMonth] = useState(monthKey(value ?? minDate));
  const days = useMemo(() => {
    const first = `${month}-01`;
    const offset = dayOfWeekOf(first);
    const cells: (DateKey | null)[] = Array.from({ length: offset }, () => null);
    for (let d = first; monthKey(d) === month; d = addDaysToKey(d, 1)) cells.push(d);
    return cells;
  }, [month]);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const canPrev = month > monthKey(minDate);
  const canNext = !maxDate || month < monthKey(maxDate);

  return (
    <div className="w-full select-none">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} disabled={!canPrev} className="rounded-md p-2 hover:bg-accent disabled:opacity-30" aria-label="Mês anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-display text-lg uppercase tracking-wide" aria-live="polite">
          {MONTHS[m - 1]} {y}
        </p>
        <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canNext} className="rounded-md p-2 hover:bg-accent disabled:opacity-30" aria-label="Próximo mês">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const disabled = date < minDate || (!!maxDate && date > maxDate) || closedWeekdays.includes(dayOfWeekOf(date));
          const selected = date === value;
          const isToday = date === minDate;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onChange(date)}
              aria-pressed={selected}
              aria-label={date.split("-").reverse().join("/")}
              className={cn(
                "relative aspect-square rounded-md text-sm transition-all sm:text-base",
                selected ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-accent",
                disabled && "cursor-not-allowed text-muted-foreground/30 line-through hover:bg-transparent",
              )}
            >
              {Number(date.slice(8))}
              {isToday && !selected && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
