import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DateNav } from "@/components/appointments/date-nav";
import { DayTimeline } from "@/components/appointments/day-timeline";
import { WeekStrip } from "@/components/appointments/week-strip";
import { PageHeader } from "@/components/ui/misc";
import { addDaysToKey, dayOfWeekOf, parseDateParam, todayKey } from "@/lib/time";
import { requirePageRole } from "@/server/auth/session";
import { getDaySchedules, getWeekSummary } from "@/server/services/schedule.service";

export const metadata = { title: "Agenda" };

export default async function BarbeiroAgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("BARBER");
  const today = todayKey();
  const date = parseDateParam((await searchParams).data, today);
  const weekStart = addDaysToKey(date, -((dayOfWeekOf(date) + 6) % 7));
  const [[schedule], week] = await Promise.all([getDaySchedules(user, date), getWeekSummary(user, user.barberId ?? "", weekStart)]);
  return (
    <div>
      <PageHeader
        title="Minha agenda"
        actions={
          <Link href="/barbeiro/agendar" className={buttonVariants()}>
            <Plus /> Novo agendamento
          </Link>
        }
      />
      <div className="mb-4">
        <WeekStrip days={week} selected={date} hrefFor={(d) => `/barbeiro/agenda?data=${d}`} />
      </div>
      <div className="mb-6">
        <DateNav date={date} today={today} basePath="/barbeiro/agenda" />
      </div>
      {schedule && <DayTimeline schedule={schedule} role="BARBER" today={today} />}
    </div>
  );
}
