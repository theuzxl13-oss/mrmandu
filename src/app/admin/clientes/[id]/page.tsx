import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarX } from "lucide-react";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { AppointmentRow } from "@/components/appointments/appointment-row";
import { Avatar, EmptyState, StatCard } from "@/components/ui/misc";
import { formatCurrency, formatInstant, formatPhone } from "@/lib/format";
import { isAppError } from "@/lib/errors";
import { todayKey } from "@/lib/time";
import { requirePageRole } from "@/server/auth/session";
import { setClientActiveAction } from "@/server/actions/admin.actions";
import { listBarberOptions } from "@/server/services/barber.service";
import { getClientDetail } from "@/server/services/client.service";

export const metadata = { title: "Cliente" };

export default async function AdminClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole("ADMIN");
  const { id } = await params;
  const client = await getClientDetail(user, id).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const barbers = await listBarberOptions(user);
  const count = (s: string) => client.stats.find((x) => x.status === s)?._count._all ?? 0;
  const spent = client.stats.find((x) => x.status === "COMPLETED")?._sum.priceCents ?? 0;
  const today = todayKey();

  return (
    <div className="space-y-8">
      <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Clientes
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} className="h-14 w-14 text-base" />
          <div>
            <h1 className="heading-display text-2xl sm:text-3xl">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.email} · {formatPhone(client.phone)}</p>
            <p className="text-xs text-muted-foreground">Cliente desde {formatInstant(new Date(client.createdAt), "dd/MM/yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{client.active ? "Ativo" : "Inativo"}</span>
          <ActiveToggle id={client.id} active={client.active} label="cliente" action={setClientActiveAction} deactivateWarning="O cliente não conseguirá entrar nem agendar até ser reativado." />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Concluídos" value={count("COMPLETED")} />
        <StatCard label="Próximos" value={count("PENDING") + count("CONFIRMED")} />
        <StatCard label="Cancelados" value={count("CANCELLED")} />
        <StatCard label="Total gasto" value={formatCurrency(spent)} />
      </div>
      <section>
        <h2 className="eyebrow mb-4">Histórico de agendamentos</h2>
        {client.history.length ? (
          <ul className="divide-y rounded-lg border bg-card">
            {client.history.map((a) => (
              <AppointmentRow key={a.id} appointment={a} role="ADMIN" today={today} barbers={barbers} person="barber" />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarX />} title="Sem agendamentos" />
        )}
      </section>
    </div>
  );
}
