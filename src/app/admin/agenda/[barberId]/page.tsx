import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Plus } from "lucide-react";
import { DateNav } from "@/components/appointments/date-nav";
import { DayTimeline } from "@/components/appointments/day-timeline";
import { WeekStrip } from "@/components/appointments/week-strip";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/misc";
import { addDaysToKey, dayOfWeekOf, parseDateParam, todayKey } from "@/lib/time";
import { requirePageRole } from "@/server/auth/session";
import { listAllBarbers } from "@/server/services/barber.service";
import { getDaySchedules, getWeekSummary } from "@/server/services/schedule.service";

export const metadata = { title: "Agenda do barbeiro" };

export default async function AdminBarberAgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ barberId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requirePageRole("ADMIN");
  const { barberId } = await params;
  const barbers = await listAllBarbers(user);
  const barber = barbers.find((b) => b.id === barberId);
  if (!barber) notFound();

  const today = todayKey();
  const date = parseDateParam((await searchParams).data, today);
  // Semana começando na segunda-feira da data escolhida
  const weekStart = addDaysToKey(date, -((dayOfWeekOf(date) + 6) % 7));
  const base = `/admin/agenda/${barber.id}`;
  const [[schedule], week] = await Promise.all([getDaySchedules(user, date, barber.id), getWeekSummary(user, barber.id, weekStart)]);
  const options = barbers.map((b) => ({ id: b.id, name: b.name, active: b.active }));

  return (
    <div className="space-y-6">
      <Link href="/admin/agenda" className="inline-flex items-center gap-2 text-caption uppercase text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Agenda geral
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={barber.name} src={barber.photo} className="h-16 w-16 text-base" />
          <div>
            <p className="eyebrow">Agenda de</p>
            <h1 className="heading-display text-heading">{barber.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {barber.specialty && <span>{barber.specialty}</span>}
              {!barber.active && <Badge className="text-muted-foreground">Inativo</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/horarios?barbeiro=${barber.id}`} className={buttonVariants({ variant: "outline" })}>
            <Clock /> Jornada
          </Link>
          <Link href="/admin/agendamentos/novo" className={buttonVariants()}>
            <Plus /> Agendar
          </Link>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Trocar barbeiro">
        {barbers.filter((b) => b.active || b.id === barber.id).map((b) => (
          <Link
            key={b.id}
            href={`/admin/agenda/${b.id}?data=${date}`}
            className={`border px-3 py-1.5 text-caption uppercase transition-colors ${b.id === barber.id ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {b.name}
          </Link>
        ))}
      </nav>

      <WeekStrip days={week} selected={date} hrefFor={(d) => `${base}?data=${d}`} />
      <DateNav date={date} today={today} basePath={base} />
      {schedule && <DayTimeline schedule={schedule} role="ADMIN" today={today} barbers={options} />}
    </div>
  );
}
