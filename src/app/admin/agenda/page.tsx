import { DateNav } from "@/components/appointments/date-nav";
import { DayTimeline } from "@/components/appointments/day-timeline";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { parseDateParam, todayKey } from "@/lib/time";
import { requirePageRole } from "@/server/auth/session";
import { listBarberOptions } from "@/server/services/barber.service";
import { getDaySchedules } from "@/server/services/schedule.service";

export const metadata = { title: "Agenda" };

export default async function AdminAgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("ADMIN");
  const params = await searchParams;
  const today = todayKey();
  const date = parseDateParam(params.data, today);
  const barbers = await listBarberOptions(user);
  const barberId = barbers.some((b) => b.id === params.barbeiro) ? params.barbeiro : undefined;
  const schedules = await getDaySchedules(user, date, barberId);

  return (
    <div>
      <PageHeader title="Agenda" description="Visão diária de todos os barbeiros." />
      <div className="mb-6 flex flex-col gap-3">
        <DateNav date={date} today={today} basePath="/admin/agenda" extraParams={{ barbeiro: barberId }} />
        <nav className="flex flex-wrap gap-2" aria-label="Filtrar barbeiro">
          {[{ id: undefined, name: "Todos" }, ...barbers.filter((b) => b.active)].map((b) => (
            <a
              key={b.id ?? "all"}
              href={`/admin/agenda?data=${date}${b.id ? `&barbeiro=${b.id}` : ""}`}
              className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${barberId === b.id ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {b.name}
            </a>
          ))}
        </nav>
      </div>
      {schedules.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {schedules.map((s) => (
            <div key={s.barberId}>
              <DayTimeline schedule={s} role="ADMIN" today={today} barbers={barbers} title={s.barberName} />
              <a href={`/admin/agenda/${s.barberId}?data=${date}`} className="mt-2 inline-block text-caption font-bold uppercase hover:underline">
                Agenda completa de {s.barberName} →
              </a>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum barbeiro ativo" action={{ label: "Cadastrar barbeiro", href: "/admin/barbeiros" }} />
      )}
    </div>
  );
}
