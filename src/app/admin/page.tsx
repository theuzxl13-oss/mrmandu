import Link from "next/link";
import { CalendarCheck, CheckCheck, DollarSign, Hourglass, Plus, Users } from "lucide-react";
import { WeekBarChart } from "@/components/admin/bar-chart";
import { AppointmentRow } from "@/components/appointments/appointment-row";
import { FlashNotice } from "@/components/layout/flash-notice";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { todayKey } from "@/lib/time";
import { requirePageRole } from "@/server/auth/session";
import { listBarberOptions } from "@/server/services/barber.service";
import { getAdminDashboard } from "@/server/services/dashboard.service";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requirePageRole("ADMIN");
  const [data, barbers] = await Promise.all([getAdminDashboard(user), listBarberOptions(user)]);
  const today = todayKey();

  return (
    <div className="space-y-8">
      <FlashNotice params={params} />
      <PageHeader
        title="Dashboard"
        description={formatDateLong(today)}
        actions={
          <Link href="/admin/agendamentos/novo" className={buttonVariants()}>
            <Plus /> Novo agendamento
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Agendamentos hoje" value={data.todayCount} icon={<CalendarCheck />} />
        <StatCard label="Clientes" value={data.clientsCount} hint="cadastrados e ativos" icon={<Users />} />
        <StatCard label="Concluídos" value={data.completedMonth} hint="neste mês" icon={<CheckCheck />} />
        <StatCard label="Faturamento" value={formatCurrency(data.revenueMonthCents)} hint="atendimentos concluídos no mês" icon={<DollarSign />} />
        <StatCard label="Pendentes" value={data.pendingCount} hint="aguardando confirmação" icon={<Hourglass />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Agendamentos · 7 dias</CardTitle></CardHeader>
          <CardContent><WeekBarChart data={data.last7Days} metric="appointments" format={(v) => String(v)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Faturamento · 7 dias</CardTitle></CardHeader>
          <CardContent><WeekBarChart data={data.last7Days} metric="revenueCents" format={(v) => formatCurrency(v)} /></CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow">Agenda do dia</h2>
          <Link href="/admin/agenda" className={buttonVariants({ variant: "ghost", size: "sm" })}>Ver agenda completa</Link>
        </div>
        {data.today.length ? (
          <ul className="divide-y rounded-lg border bg-card">
            {data.today.map((a) => (
              <AppointmentRow key={a.id} appointment={a} role="ADMIN" today={today} barbers={barbers} person="client" />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarCheck />} title="Nenhum agendamento hoje" action={{ label: "Criar agendamento", href: "/admin/agendamentos/novo" }} />
        )}
      </section>
    </div>
  );
}
