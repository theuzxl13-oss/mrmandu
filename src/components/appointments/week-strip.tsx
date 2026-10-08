import Link from "next/link";
import { DAYS_OF_WEEK } from "@/config/shop";
import { dayOfWeekOf, type DateKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { DaySummary } from "@/server/services/schedule.service";

/** Faixa da semana com total de atendimentos por dia (link para o dia). */
export function WeekStrip({ days, selected, hrefFor }: { days: DaySummary[]; selected: DateKey; hrefFor: (date: DateKey) => string }) {
  return (
    <nav className="grid grid-cols-7 border" aria-label="Semana">
      {days.map((d) => {
        const active = d.date === selected;
        return (
          <Link
            key={d.date}
            href={hrefFor(d.date)}
            aria-current={active ? "date" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 border-r px-1 py-3 transition-colors last:border-r-0",
              active ? "bg-foreground text-background" : "hover:bg-accent",
            )}
          >
            <span className={cn("text-[11px] uppercase", active ? "text-background/70" : "text-muted-foreground")}>{DAYS_OF_WEEK[dayOfWeekOf(d.date)]?.short}</span>
            <span className="text-xl tabular-nums leading-none sm:text-2xl">{Number(d.date.slice(8))}</span>
            <span className={cn("text-[11px] tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>
              {d.count ? `${d.count} atend.` : "—"}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
