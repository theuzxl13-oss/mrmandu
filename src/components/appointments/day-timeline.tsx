import { Moon } from "lucide-react";
import type { DateKey } from "@/lib/time";
import type { BarberDaySchedule } from "@/server/services/schedule.service";
import type { UserRole } from "@/types/auth";
import { AppointmentActions } from "./appointment-actions";
import type { BarberOption } from "./reschedule-dialog";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

interface Props {
  schedule: BarberDaySchedule;
  role: UserRole;
  today: DateKey;
  barbers?: BarberOption[];
  title?: string;
}

/** Agenda do dia em formato de linha do tempo (08:00 — Livre / 08:30 — João, Corte...). */
export function DayTimeline({ schedule, role, today, barbers, title }: Props) {
  const booked = schedule.items.filter((i) => i.kind === "appointment").length;
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <p className="font-display text-lg uppercase tracking-wide">{title}</p>
          <p className="text-xs text-muted-foreground">{booked} atendimento{booked === 1 ? "" : "s"}</p>
        </div>
      )}
      {schedule.items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center text-muted-foreground">
          <Moon className="h-7 w-7" />
          <p className="mt-3 font-display uppercase tracking-wide text-foreground">{schedule.closed ? "Sem expediente" : "Agenda vazia"}</p>
          <p className="mt-1 text-sm">{schedule.closed ? "Dia fechado ou folga." : "Nenhum horário neste dia."}</p>
        </div>
      ) : (
        <ol>
          {schedule.items.map((item) =>
            item.kind === "free" ? (
              <li key={`f-${item.time}`} className="flex items-center gap-4 border-b px-4 py-3 last:border-0 sm:px-5">
                <span className="w-14 shrink-0 font-display tabular-nums text-muted-foreground">{item.time}</span>
                <span className="h-px flex-1 bg-border" aria-hidden />
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Livre</span>
              </li>
            ) : (
              <li
                key={item.appointment.id}
                className={cn(
                  "flex flex-col gap-3 border-b border-l-2 bg-background/40 px-4 py-4 last:border-b-0 sm:px-5 lg:flex-row lg:items-center",
                  item.appointment.status === "COMPLETED" ? "border-l-success" : item.appointment.status === "PENDING" ? "border-l-warning" : "border-l-foreground",
                )}
              >
                <div className="flex flex-1 items-start gap-4">
                  <span className="w-14 shrink-0 font-display text-lg tabular-nums">{item.time}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.appointment.client.name}</p>
                      <StatusBadge status={item.appointment.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.appointment.service.name} · até {item.appointment.endTime}
                    </p>
                    {item.appointment.notes && <p className="mt-1 text-xs italic text-muted-foreground">“{item.appointment.notes}”</p>}
                  </div>
                </div>
                <AppointmentActions appointment={item.appointment} role={role} today={today} barbers={barbers} compact className="pl-[4.5rem] lg:pl-0" />
              </li>
            ),
          )}
        </ol>
      )}
      {schedule.cancelled.length > 0 && (
        <p className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
          {schedule.cancelled.length} cancelamento{schedule.cancelled.length === 1 ? "" : "s"} neste dia
        </p>
      )}
    </div>
  );
}
