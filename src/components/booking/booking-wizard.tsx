"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { formatCurrency, formatDateKey, formatDateLong, formatDuration } from "@/lib/format";
import type { DateKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { createAppointmentAction, getAvailabilityAction } from "@/server/actions/appointment.actions";
import type { AppointmentDTO } from "@/server/services/appointment.service";
import type { PublicBarberDTO } from "@/server/services/barber.service";
import type { ServiceDTO } from "@/server/services/catalog.service";
import { ANY_BARBER } from "@/validations/appointment";
import { Calendar } from "./calendar";
import { SlotPicker, type SlotView } from "./slot-picker";

const STEPS = ["Serviço", "Barbeiro", "Data", "Horário", "Resumo"] as const;

interface ClientOption {
  id: string;
  name: string;
  email: string;
}

interface BookingWizardProps {
  services: ServiceDTO[];
  barbers: PublicBarberDTO[];
  today: DateKey;
  maxDate?: DateKey;
  closedWeekdays: number[];
  initialServiceId?: string;
  initialBarberId?: string;
  /** Modo equipe (admin/barbeiro): agenda em nome de um cliente. */
  clients?: ClientOption[];
  /** Barbeiro fixo (agenda do próprio barbeiro): pula a etapa de escolha do barbeiro. */
  lockBarber?: boolean;
  successHref: string;
}

export function BookingWizard(props: BookingWizardProps) {
  const { services, barbers, today, maxDate, closedWeekdays, clients, successHref, lockBarber = false } = props;
  const validService = services.some((s) => s.id === props.initialServiceId) ? props.initialServiceId! : null;
  const validBarber = barbers.some((b) => b.id === props.initialBarberId) ? props.initialBarberId! : null;

  const [step, setStep] = useState(validService ? (validBarber ? 2 : 1) : 0);
  const [serviceId, setServiceId] = useState<string | null>(validService);
  const [barberId, setBarberId] = useState<string | null>(validBarber);
  const [date, setDate] = useState<DateKey | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState("");
  const [availability, setAvailability] = useState<{ slots: SlotView[]; closed: boolean } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<AppointmentDTO | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const barber = barbers.find((b) => b.id === barberId);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !barberId || !date) return;
    setLoadingSlots(true);
    try {
      const result = await getAvailabilityAction({ serviceId, barberId, date });
      if (result.ok) setAvailability(result.data);
      else {
        toast.error(result.error);
        setAvailability(null);
      }
    } catch {
      toast.error("Falha de conexão ao carregar horários.");
    } finally {
      setLoadingSlots(false);
    }
  }, [serviceId, barberId, date]);

  useEffect(() => {
    if (step === 3) void loadSlots();
  }, [step, loadSlots]);

  const canAdvance = [!!serviceId, !!barberId, !!date, !!time, !clients || !!clientId][step];

  async function confirm() {
    if (!serviceId || !barberId || !date || !time) return;
    setSubmitting(true);
    try {
      const payload = { serviceId, barberId, date, time, notes: notes || undefined, ...(clients ? { clientId } : {}) };
      const result = await createAppointmentAction(payload);
      if (result.ok) {
        setCreated(result.data);
        toast.success("Agendamento realizado com sucesso!");
      } else {
        toast.error(result.error);
        if (["SLOT_UNAVAILABLE", "NO_BARBER_AVAILABLE", "SLOT_IN_PAST", "OUTSIDE_BUSINESS_HOURS"].includes(result.code ?? "")) {
          setTime(null);
          setStep(3);
        }
      }
    } catch {
      toast.error("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up text-center">
        <CheckCircle2 className="mx-auto h-16 w-16" strokeWidth={1.25} />
        <h2 className="heading-display mt-6 text-3xl sm:text-4xl">Agendamento realizado com sucesso!</h2>
        <p className="mt-3 text-muted-foreground">
          {created.status === "PENDING" ? "Seu horário foi reservado e aguarda confirmação da barbearia." : "Horário confirmado."}
        </p>
        <div className="mt-8 rounded-lg border bg-card p-6 text-left">
          <Summary
            items={[
              ["Serviço", created.service.name],
              ["Barbeiro", created.barber.name],
              ["Data", formatDateKey(created.date)],
              ["Horário", created.startTime],
              ["Valor", formatCurrency(created.priceCents)],
              ...(clients ? ([["Cliente", created.client.name]] as [string, string][]) : []),
            ]}
          />
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={successHref} className={buttonVariants({ size: "lg" })}>
            {clients ? "Ver agendamentos" : "Ver meus horários"}
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setCreated(null);
              setStep(0);
              setDate(null);
              setTime(null);
              setNotes("");
            }}
          >
            Novo agendamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-0">
      {/* Indicador de etapas */}
      <ol className="mb-8 grid grid-cols-5 gap-2" aria-label="Etapas do agendamento">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => i < step && !(lockBarber && i === 1) && setStep(i)}
              disabled={i >= step || (lockBarber && i === 1)}
              className="w-full text-left disabled:cursor-default"
              aria-current={i === step ? "step" : undefined}
            >
              <span className={cn("block h-0.5 rounded-full transition-colors", i <= step ? "bg-foreground" : "bg-border")} />
              <span className={cn("mt-2 hidden text-[11px] uppercase tracking-[0.15em] sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
                {i + 1}. {label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="eyebrow mb-2 sm:hidden">Etapa {step + 1} de 5</p>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section key={step} className="animate-fade-up">
          {step === 0 && (
            <StepTitle title="Escolha o serviço">
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <OptionCard
                    key={s.id}
                    selected={s.id === serviceId}
                    onClick={() => {
                      setServiceId(s.id);
                      setTime(null);
                      setStep(lockBarber ? 2 : 1);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-lg uppercase tracking-wide">{s.name}</p>
                      <p className="font-display text-lg">{formatCurrency(s.priceCents)}</p>
                    </div>
                    {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMinutes)}
                    </p>
                  </OptionCard>
                ))}
              </div>
            </StepTitle>
          )}

          {step === 1 && (
            <StepTitle title="Escolha o barbeiro">
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard
                  selected={barberId === ANY_BARBER}
                  onClick={() => {
                    setBarberId(ANY_BARBER);
                    setTime(null);
                    setStep(2);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border">
                      <Users className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-lg uppercase tracking-wide">Qualquer barbeiro</p>
                      <p className="text-sm text-muted-foreground">Primeiro disponível no horário</p>
                    </div>
                  </div>
                </OptionCard>
                {barbers.map((b) => (
                  <OptionCard
                    key={b.id}
                    selected={b.id === barberId}
                    onClick={() => {
                      setBarberId(b.id);
                      setTime(null);
                      setStep(2);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={b.name} src={b.photo} className="h-12 w-12" />
                      <div>
                        <p className="font-display text-lg uppercase tracking-wide">{b.name}</p>
                        {b.specialty && <p className="text-sm text-muted-foreground">{b.specialty}</p>}
                      </div>
                    </div>
                  </OptionCard>
                ))}
              </div>
            </StepTitle>
          )}

          {step === 2 && (
            <StepTitle title="Escolha a data">
              <div className="max-w-md rounded-lg border bg-card p-4 sm:p-6">
                <Calendar
                  value={date}
                  minDate={today}
                  maxDate={maxDate}
                  closedWeekdays={closedWeekdays}
                  onChange={(d) => {
                    setDate(d);
                    setTime(null);
                    setAvailability(null);
                    setStep(3);
                  }}
                />
              </div>
            </StepTitle>
          )}

          {step === 3 && (
            <StepTitle title="Escolha o horário" subtitle={date ? formatDateLong(date) : undefined}>
              <SlotPicker
                slots={availability?.slots ?? null}
                closed={availability?.closed}
                loading={loadingSlots}
                value={time}
                onChange={(t) => {
                  setTime(t);
                  setStep(4);
                }}
              />
            </StepTitle>
          )}

          {step === 4 && service && date && time && (
            <StepTitle title={clients ? "Confirme o agendamento" : "Confirme seu agendamento"}>
              <div className="rounded-lg border bg-card p-5 sm:p-8">
                <Summary
                  large
                  items={[
                    ["Serviço", service.name],
                    ["Barbeiro", barber?.name ?? "Qualquer barbeiro disponível"],
                    ["Data", formatDateKey(date)],
                    ["Horário", time],
                    ["Valor", formatCurrency(service.priceCents)],
                  ]}
                />
                {clients && (
                  <Field label="Cliente" htmlFor="client" className="mt-8">
                    <Select id="client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      <option value="">Selecione o cliente</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.email}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Observações (opcional)" htmlFor="notes" className="mt-8">
                  <Textarea id="notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma preferência para o atendimento?" />
                </Field>
                <Button size="lg" className="mt-8 hidden w-full md:flex" onClick={confirm} loading={submitting} disabled={!canAdvance}>
                  <Check /> Confirmar agendamento
                </Button>
              </div>
            </StepTitle>
          )}
        </section>

        {/* Resumo lateral (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border bg-card p-6">
            <p className="eyebrow mb-5">Seu agendamento</p>
            <Summary
              items={[
                ["Serviço", service?.name ?? "—"],
                ["Barbeiro", barberId === ANY_BARBER ? "Qualquer disponível" : (barber?.name ?? "—")],
                ["Data", date ? formatDateKey(date) : "—"],
                ["Horário", time ?? "—"],
                ["Valor", service ? formatCurrency(service.priceCents) : "—"],
              ]}
            />
          </div>
        </aside>
      </div>

      {/* Navegação entre etapas */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-7xl gap-3">
          {step > 0 && (
            <Button variant="outline" size="lg" className="flex-1 md:flex-none" onClick={() => setStep(lockBarber && step === 2 ? 0 : step - 1)}>
              <ArrowLeft /> Voltar
            </Button>
          )}
          {step < 4 ? (
            <Button size="lg" className="flex-1 md:ml-auto md:flex-none" disabled={!canAdvance} onClick={() => setStep(lockBarber && step === 0 ? 2 : step + 1)}>
              Continuar <ArrowRight />
            </Button>
          ) : (
            <Button size="lg" className="flex-1 md:hidden" onClick={confirm} loading={submitting} disabled={!canAdvance}>
              Confirmar agendamento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepTitle({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="heading-display text-2xl sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative w-full rounded-lg border bg-card p-5 text-left transition-all hover:border-foreground/40 active:scale-[0.99]",
        selected && "border-foreground ring-1 ring-foreground",
      )}
    >
      {children}
      {selected && (
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

function Summary({ items, large }: { items: [string, string][]; large?: boolean }) {
  return (
    <dl className={cn("grid gap-5", large && "sm:grid-cols-2")}>
      {items.map(([label, value]) => (
        <div key={label} className={cn(large && label === "Valor" && "sm:col-span-2 border-t pt-5")}>
          <dt className="eyebrow !tracking-[0.2em]">{label}</dt>
          <dd className={cn("mt-1", large ? "font-display text-2xl uppercase tracking-wide" : "text-sm")}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
