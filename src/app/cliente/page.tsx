import Link from "next/link";
import { CalendarCheck, CalendarX, History, Plus } from "lucide-react";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { AppointmentRow } from "@/components/appointments/appointment-row";
import { StatusBadge } from "@/components/appointments/status-badge";
import { FlashNotice } from "@/components/layout/flash-notice";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { todayKey } from "@/lib/time";
import { cn, firstName } from "@/lib/utils";
import { requirePageRole } from "@/server/auth/session";
import { listClientAppointments } from "@/server/services/appointment.service";

export const metadata = { title: "Meus horários" };

const TABS = [
  { key: "proximos", label: "Próximos", icon: CalendarCheck },
  { key: "historico", label: "Concluídos", icon: History },
  { key: "cancelados", label: "Cancelados", icon: CalendarX },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function ClienteDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requirePageRole("CLIENT");
  const data = await listClientAppointments(user);
  const today = todayKey();
  const tab: Tab = TABS.some((t) => t.key === params.aba) ? (params.aba as Tab) : "proximos";
  const next = data.upcoming[0];
  const lists = { proximos: data.upcoming, historico: data.past, cancelados: data.cancelled };
  const list = lists[tab];

  return (
    <div className="space-y-10">
      <FlashNotice params={params} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Área do cliente</p>
          <h1 className="heading-display mt-2 text-3xl sm:text-4xl">Olá, {firstName(user.name)}</h1>
        </div>
        <Link href="/cliente/agendar" className={buttonVariants({ size: "lg" })}>
          <Plus /> Novo agendamento
        </Link>
      </div>

      <section aria-labelledby="next-title">
        <h2 id="next-title" className="eyebrow mb-4">Seu próximo horário</h2>
        {next ? (
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={next.status} />
                  <span className="text-sm text-muted-foreground">{formatDateLong(next.date)}</span>
                </div>
                <p className="mt-4 font-display text-5xl tabular-nums sm:text-6xl">{next.startTime}</p>
                <p className="mt-2 font-display text-xl uppercase tracking-wide">{next.service.name}</p>
              </div>
              <dl className="grid grid-cols-2 gap-6 border-t pt-6 text-sm md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <div className="col-span-2 flex items-center gap-3">
                  <Avatar name={next.barber.name} src={next.barber.photo} />
                  <div>
                    <dt className="eyebrow !tracking-[0.15em]">Barbeiro</dt>
                    <dd className="mt-0.5">{next.barber.name}</dd>
                  </div>
                </div>
                <div>
                  <dt className="eyebrow !tracking-[0.15em]">Horário</dt>
                  <dd className="mt-1">{next.startTime} – {next.endTime}</dd>
                </div>
                <div>
                  <dt className="eyebrow !tracking-[0.15em]">Valor</dt>
                  <dd className="mt-1">{formatCurrency(next.priceCents)}</dd>
                </div>
              </dl>
            </div>
            <div className="border-t bg-background/40 px-5 py-4 sm:px-8">
              <AppointmentActions appointment={next} role="CLIENT" today={today} />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<CalendarCheck />}
            title="Você ainda não possui agendamentos."
            description="Escolha o serviço, o barbeiro e o melhor horário para você."
            action={{ label: "Agendar meu primeiro horário", href: "/cliente/agendar" }}
          />
        )}
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="eyebrow mb-4">Meus agendamentos</h2>
        <nav className="mb-4 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" aria-label="Filtrar agendamentos">
          {TABS.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/cliente?aba=${key}`}
              scroll={false}
              aria-current={tab === key ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm transition-colors",
                tab === key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
              <span className="text-xs text-muted-foreground">{lists[key].length}</span>
            </Link>
          ))}
        </nav>
        {list.length ? (
          <ul className="divide-y rounded-lg border bg-card">
            {list.map((a) => (
              <AppointmentRow key={a.id} appointment={a} role="CLIENT" today={today} person="barber" />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={tab === "proximos" ? "Nenhum horário futuro" : tab === "historico" ? "Nenhum atendimento concluído" : "Nenhum cancelamento"}
            description={tab === "proximos" ? "Que tal reservar seu próximo corte?" : undefined}
            action={tab === "proximos" ? { label: "Agendar horário", href: "/cliente/agendar" } : undefined}
          />
        )}
      </section>
    </div>
  );
}
