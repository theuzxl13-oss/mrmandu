import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Plus } from "lucide-react";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { StatusBadge } from "@/components/appointments/status-badge";
import { LoyaltyCard } from "@/components/client/loyalty-card";
import { FlashNotice } from "@/components/layout/flash-notice";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { todayKey } from "@/lib/time";
import { firstName } from "@/lib/utils";
import { requirePageRole } from "@/server/auth/session";
import { listClientAppointments } from "@/server/services/appointment.service";
import { getLoyaltyStatus } from "@/server/services/loyalty.service";
import { getMySubscription } from "@/server/services/plan.service";
import { SUBSCRIPTION_LABEL } from "@/components/client/subscription-labels";

export const metadata = { title: "Início" };

export default async function ClienteInicio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requirePageRole("CLIENT");
  const [data, loyalty, subscription] = await Promise.all([
    listClientAppointments(user),
    getLoyaltyStatus(user),
    getMySubscription(user),
  ]);
  const today = todayKey();
  const next = data.upcoming[0];

  return (
    <div className="space-y-10">
      <FlashNotice params={params} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{formatDateLong(today)}</p>
          <h1 className="heading-display mt-2 text-heading">Olá, {firstName(user.name)}</h1>
        </div>
        <Link href="/cliente/agendar" className={buttonVariants({ size: "lg" })}>
          <Plus /> Novo agendamento
        </Link>
      </div>

      <section aria-labelledby="next-title">
        <h2 id="next-title" className="eyebrow mb-4">Seu próximo horário</h2>
        {next ? (
          <div className="border">
            <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={next.status} />
                  <span className="text-sm text-muted-foreground">{formatDateLong(next.date)}</span>
                </div>
                <p className="mt-4 text-[clamp(3.5rem,10vw,7rem)] leading-[0.85] tabular-nums tracking-[-0.03em]">{next.startTime}</p>
                <p className="mt-3 text-[20px] uppercase">{next.service.name}</p>
              </div>
              <dl className="grid grid-cols-2 gap-6 border-t pt-6 text-sm md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <div className="col-span-2 flex items-center gap-3">
                  <Avatar name={next.barber.name} src={next.barber.photo} />
                  <div>
                    <dt className="eyebrow">Barbeiro</dt>
                    <dd className="mt-0.5">{next.barber.name}</dd>
                  </div>
                </div>
                <div>
                  <dt className="eyebrow">Horário</dt>
                  <dd className="mt-1">{next.startTime} – {next.endTime}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Valor</dt>
                  <dd className="mt-1">{formatCurrency(next.priceCents)}</dd>
                </div>
              </dl>
            </div>
            <div className="border-t px-5 py-4 sm:px-8">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Link href="/cliente/clube" className="group block transition-opacity hover:opacity-90">
          <LoyaltyCard status={loyalty} compact />
        </Link>
        <Link href="/cliente/plano" className="group flex flex-col justify-between border p-5 transition-colors hover:border-foreground/50 sm:p-8">
          <div>
            <p className="eyebrow">Plano</p>
            <p className="mt-3 heading-display text-3xl">{subscription ? subscription.plan.name : "Sem plano"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {subscription
                ? `${SUBSCRIPTION_LABEL[subscription.status]} · ${formatCurrency(subscription.priceCents)}/mês`
                : "Conheça os planos mensais e economize nos seus cortes."}
            </p>
          </div>
          <span className="mt-8 flex items-center gap-2 text-caption font-bold uppercase">
            {subscription ? "Ver meu plano" : "Ver planos"} <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      <div className="flex items-center justify-between border-t pt-6 text-sm">
        <span className="text-muted-foreground">{data.upcoming.length} próximo(s) · {data.past.length} no histórico</span>
        <Link href="/cliente/agendamentos" className="text-caption font-bold uppercase hover:underline">Todos os agendamentos →</Link>
      </div>
    </div>
  );
}
