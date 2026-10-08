import { formatDateShort } from "@/lib/format";
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
          <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:text-xs">{format(value)}</span>
            <div className="w-full rounded-t-sm bg-foreground/80 transition-all group-hover:bg-foreground" style={{ height: `${height}%` }} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{formatDateShort(d.date).split(",")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
