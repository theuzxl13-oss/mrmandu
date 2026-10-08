import Link from "next/link";
import { CalendarCheck, CalendarX, History, Plus } from "lucide-react";
import { AppointmentRow } from "@/components/appointments/appointment-row";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { todayKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { requirePageRole } from "@/server/auth/session";
import { listClientAppointments } from "@/server/services/appointment.service";

export const metadata = { title: "Agendamentos" };

const TABS = [
  { key: "proximos", label: "Próximos", icon: CalendarCheck },
  { key: "historico", label: "Concluídos", icon: History },
  { key: "cancelados", label: "Cancelados", icon: CalendarX },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function ClienteAgendamentosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requirePageRole("CLIENT");
  const data = await listClientAppointments(user);
  const today = todayKey();
  const tab: Tab = TABS.some((t) => t.key === params.aba) ? (params.aba as Tab) : "proximos";
  const lists = { proximos: data.upcoming, historico: data.past, cancelados: data.cancelled };
  const list = lists[tab];

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        description="Seus próximos horários e o histórico de atendimentos."
        actions={<Link href="/cliente/agendar" className={buttonVariants()}><Plus /> Novo agendamento</Link>}
      />
      <nav className="mb-4 flex gap-1 overflow-x-auto border p-1" aria-label="Filtrar agendamentos">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/cliente/agendamentos?aba=${key}`}
            scroll={false}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
              tab === key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className="text-xs text-muted-foreground">{lists[key].length}</span>
          </Link>
        ))}
      </nav>
      {list.length ? (
        <ul className="divide-y border">
          {list.map((a) => (
            <AppointmentRow key={a.id} appointment={a} role="CLIENT" today={today} person="barber" />
          ))}
        </ul>
      ) : tab === "proximos" ? (
        <EmptyState
          icon={<CalendarCheck />}
          title="Você ainda não possui agendamentos."
          description="Escolha o serviço, o barbeiro e o melhor horário para você."
          action={{ label: "Agendar meu primeiro horário", href: "/cliente/agendar" }}
        />
      ) : (
        <EmptyState title={tab === "historico" ? "Nenhum atendimento concluído" : "Nenhum cancelamento"} />
      )}
    </div>
  );
}
