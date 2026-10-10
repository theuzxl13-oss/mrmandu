import Link from "next/link";
import { CalendarCheck, CheckCheck, Clock, Hourglass, Plus } from "lucide-react";
import { DayTimeline } from "@/components/appointments/day-timeline";
import { StatusBadge } from "@/components/appointments/status-badge";
import { FlashNotice } from "@/components/layout/flash-notice";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/ui/misc";
import { formatDateLong, formatDateShort } from "@/lib/format";
import { todayKey } from "@/lib/time";
import { firstName } from "@/lib/utils";
import { requirePageRole } from "@/server/auth/session";
import { getBarberDashboard } from "@/server/services/dashboard.service";
import { getDaySchedules } from "@/server/services/schedule.service";

export const metadata = { title: "Minha agenda" };

export default async function BarbeiroDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requirePageRole("BARBER");
  const today = todayKey();
  const [stats, [schedule]] = await Promise.all([getBarberDashboard(user), getDaySchedules(user, today)]);

  return (
    <div className="space-y-8">
      <FlashNotice params={params} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{formatDateLong(today)}</p>
          <h1 className="heading-display mt-2 text-3xl sm:text-4xl">Bom trabalho, {firstName(user.name)}</h1>
        </div>
        <Link href="/barbeiro/agendar" className={buttonVariants({ size: "lg" })}>
          <Plus /> Novo agendamento
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Hoje" value={stats.todayCount} hint="agendamentos" icon={<CalendarCheck />} />
        <StatCard label="Próximo" value={stats.next ? stats.next.startTime : "—"} hint={stats.next ? `${formatDateShort(stats.next.date)} · ${stats.next.client.name}` : "Nenhum agendado"} icon={<Clock />} />
        <StatCard label="Pendentes" value={stats.pendingCount} hint="aguardando confirmação" icon={<Hourglass />} />
        <StatCard label="Concluídos" value={stats.totalCompleted} hint="atendimentos no total" icon={<CheckCheck />} />
      </div>

      {stats.next && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Próximo atendimento</p>
            <p className="mt-2 text-lg">
              <span className="font-display text-2xl">{stats.next.startTime}</span> · {stats.next.client.name} — {stats.next.service.name}
            </p>
          </div>
          <StatusBadge status={stats.next.status} />
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow">Agenda de hoje</h2>
          <Link href="/barbeiro/agenda" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Ver outros dias
          </Link>
        </div>
        {schedule && <DayTimeline schedule={schedule} role="BARBER" today={today} />}
      </section>
    </div>
  );
}
