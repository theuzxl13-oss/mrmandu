"use client";

import { CalendarX2 } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export interface SlotView {
  time: string;
  available: boolean;
}

interface SlotPickerProps {
  slots: SlotView[] | null;
  loading: boolean;
  closed?: boolean;
  value: string | null;
  onChange: (time: string) => void;
}

/** Grade de horários: ocupados aparecem riscados e não podem ser selecionados. */
export function SlotPicker({ slots, loading, closed, value, onChange }: SlotPickerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (!slots) return null;
  const available = slots.filter((s) => s.available).length;
  if (closed || slots.length === 0 || available === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-10 text-center">
        <CalendarX2 className="h-7 w-7 text-muted-foreground" />
        <p className="mt-3 font-display uppercase tracking-wide">
          {closed ? "Fechado neste dia" : "Sem horários disponíveis"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Escolha outra data.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Horários">
        {slots.map((slot) => {
          const selected = slot.time === value;
          return (
            <button
              key={slot.time}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!slot.available}
              onClick={() => onChange(slot.time)}
              title={slot.available ? undefined : "Horário indisponível"}
              className={cn(
                "h-12 rounded-md border text-sm font-medium tabular-nums transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-foreground/50 hover:bg-accent",
                !slot.available &&
                  "cursor-not-allowed border-dashed bg-transparent text-muted-foreground/40 line-through hover:border-border hover:bg-transparent",
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" /> Disponível</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-dashed opacity-40" /> Ocupado</span>
        <span className="ml-auto">{available} livres</span>
      </div>
    </div>
  );
}
