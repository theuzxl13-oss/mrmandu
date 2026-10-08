import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { todayKey } from "@/lib/time";
import { listAppointments } from "@/server/services/appointment.service";
import type { SessionUser } from "@/types/auth";
import { APPOINTMENT_STATUSES, appointmentFiltersSchema } from "@/validations/appointment";
import { AppointmentRow } from "./appointment-row";
import type { BarberOption } from "./reschedule-dialog";
import { STATUS_LABEL } from "./status-badge";

interface Props {
  actor: SessionUser;
  basePath: string;
  rawParams: Record<string, string | undefined>;
  services: { id: string; name: string }[];
  barbers?: BarberOption[];
}

/** Lista filtrável/paginada (filtros via GET — compartilháveis por URL). */
export async function AppointmentsList({ actor, basePath, rawParams, services, barbers }: Props) {
  const filters = appointmentFiltersSchema.parse(rawParams);
  const data = await listAppointments(actor, filters);
  const today = todayKey();
  const hasFilters = !!(filters.date || filters.barberId || filters.serviceId || filters.status || filters.q);

  return (
    <div>
      <form action={basePath} className="mb-4 grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-6">
        {actor.role === "ADMIN" && (
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={filters.q} placeholder="Buscar cliente (nome, e-mail, telefone)" className="pl-9" aria-label="Buscar cliente" />
          </div>
        )}
        <Input type="date" name="date" defaultValue={filters.date} aria-label="Data" className="[color-scheme:dark]" />
        {barbers && (
          <Select name="barberId" defaultValue={filters.barberId ?? ""} aria-label="Barbeiro">
            <option value="">Todos os barbeiros</option>
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
        <Select name="serviceId" defaultValue={filters.serviceId ?? ""} aria-label="Serviço">
          <option value="">Todos os serviços</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select name="status" defaultValue={filters.status ?? ""} aria-label="Status">
          <option value="">Todos os status</option>
          {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6 lg:justify-end">
          {hasFilters && (
            <Link href={basePath} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Limpar filtros
            </Link>
          )}
          <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Filtrar
          </button>
        </div>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">{data.total} agendamento{data.total === 1 ? "" : "s"}</p>
      {data.items.length ? (
        <ul className="divide-y rounded-lg border bg-card">
          {data.items.map((a) => (
            <AppointmentRow key={a.id} appointment={a} role={actor.role} today={today} barbers={barbers} person="client" />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<ClipboardList />} title="Nenhum agendamento encontrado" description={hasFilters ? "Ajuste os filtros para ver outros resultados." : undefined} />
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath={basePath} params={rawParams} />
    </div>
  );
}
