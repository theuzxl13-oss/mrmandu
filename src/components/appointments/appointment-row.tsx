import { formatCurrency, formatDateShort } from "@/lib/format";
import type { DateKey } from "@/lib/time";
import type { AppointmentDTO } from "@/server/services/appointment.service";
import type { UserRole } from "@/types/auth";
import { AppointmentActions } from "./appointment-actions";
import type { BarberOption } from "./reschedule-dialog";
import { StatusBadge } from "./status-badge";

interface Props {
  appointment: AppointmentDTO;
  role: UserRole;
  today: DateKey;
  barbers?: BarberOption[];
  /** Quem aparece como "pessoa" da linha: barbeiro (visão do cliente) ou cliente (visão da equipe). */
  person: "barber" | "client";
}

/** Linha de agendamento responsiva usada nas listas de cliente, barbeiro e admin. */
export function AppointmentRow({ appointment: a, role, today, barbers, person }: Props) {
  return (
    <li className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="w-16 shrink-0 text-center">
          <p className="font-display text-2xl leading-none tabular-nums">{a.startTime}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{formatDateShort(a.date)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{a.service.name}</p>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {person === "barber" ? `com ${a.barber.name}` : a.client.name}
            {person === "client" && role === "ADMIN" && ` · ${a.barber.name}`}
            {" · "}
            {formatCurrency(a.priceCents)}
          </p>
        </div>
      </div>
      <AppointmentActions appointment={a} role={role} today={today} barbers={barbers} compact className="lg:justify-end" />
    </li>
  );
}
