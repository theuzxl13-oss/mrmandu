import { DateNav } from "@/components/appointments/date-nav";
import { DayTimeline } from "@/components/appointments/day-timeline";
import { PageHeader } from "@/components/ui/misc";
import { parseDateParam, todayKey } from "@/lib/time";
import { requirePageRole } from "@/server/auth/session";
import { getDaySchedules } from "@/server/services/schedule.service";

export const metadata = { title: "Agenda" };

export default async function BarbeiroAgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("BARBER");
  const today = todayKey();
  const date = parseDateParam((await searchParams).data, today);
  const [schedule] = await getDaySchedules(user, date);
  return (
    <div>
      <PageHeader title="Minha agenda" />
      <div className="mb-6">
        <DateNav date={date} today={today} basePath="/barbeiro/agenda" />
      </div>
      {schedule && <DayTimeline schedule={schedule} role="BARBER" today={today} />}
    </div>
  );
}
