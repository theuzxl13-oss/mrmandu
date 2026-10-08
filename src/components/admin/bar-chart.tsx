import { DAYS_OF_WEEK } from "@/config/shop";
import { dayOfWeekOf } from "@/lib/time";
import type { DailyPoint } from "@/server/services/dashboard.service";

/** Gráfico de barras leve (CSS puro) — sem dependência de biblioteca de gráficos. */
export function WeekBarChart({ data, metric, format }: { data: DailyPoint[]; metric: "appointments" | "revenueCents"; format: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d[metric]));
  return (
    <div className="flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label={`Gráfico: ${data.map((d) => `${d.date}: ${format(d[metric])}`).join(", ")}`}>
      {data.map((d) => {
        const value = d[metric];
        const height = Math.max(2, (value / max) * 100);
        return (
          <div key={d.date} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="truncate text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:text-xs">{format(value)}</span>
            <div className="w-full max-w-12 bg-foreground/80 transition-all group-hover:bg-foreground" style={{ height: `${height}%` }} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{DAYS_OF_WEEK[dayOfWeekOf(d.date)]?.short}</span>
          </div>
        );
      })}
    </div>
  );
}
