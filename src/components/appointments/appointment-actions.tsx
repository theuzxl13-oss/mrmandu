"use client";

import { useState } from "react";
import { CalendarClock, Check, CheckCheck, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { formatCurrency, formatDateKey, formatDuration, formatPhone } from "@/lib/format";
import type { DateKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  cancelAppointmentAction,
  completeAppointmentAction,
  confirmAppointmentAction,
  updateNotesAction,
} from "@/server/actions/appointment.actions";
import type { AppointmentDTO } from "@/server/services/appointment.service";
import type { UserRole } from "@/types/auth";
import { RescheduleDialog, type BarberOption } from "./reschedule-dialog";
import { StatusBadge } from "./status-badge";

interface Props {
  appointment: AppointmentDTO;
  role: UserRole;
  today: DateKey;
  barbers?: BarberOption[];
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * Ações disponíveis para um agendamento conforme perfil e status.
 * A UI apenas reflete as regras — o backend revalida todas elas.
 */
export function AppointmentActions({ appointment: a, role, today, barbers, compact, showDetails = true, className }: Props) {
  const [dialog, setDialog] = useState<"cancel" | "reschedule" | "details" | "complete" | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState(a.notes ?? "");
  const close = () => setDialog(null);
  const opts = { refresh: true, onSuccess: close };
  const cancel = useAction(cancelAppointmentAction, opts);
  const confirm = useAction(confirmAppointmentAction, opts);
  const complete = useAction(completeAppointmentAction, opts);
  const saveNotes = useAction(updateNotesAction, { refresh: true });

  const active = a.status === "PENDING" || a.status === "CONFIRMED";
  const started = new Date(a.startsAt).getTime() <= Date.now();
  const staff = role !== "CLIENT";
  const canConfirm = staff && a.status === "PENDING";
  const canComplete = staff && active && started;
  const canChange = active && (staff || !started);
  const size = compact ? "sm" : "md";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {showDetails && (
        <Button variant="ghost" size={size} onClick={() => setDialog("details")}>
          <Eye /> Detalhes
        </Button>
      )}
      {canConfirm && (
        <Button variant="secondary" size={size} loading={confirm.pending} onClick={() => confirm.run(a.id)}>
          <Check /> Confirmar
        </Button>
      )}
      {canComplete && (
        <Button variant="secondary" size={size} onClick={() => setDialog("complete")}>
          <CheckCheck /> Concluir
        </Button>
      )}
      {canChange && (
        <Button variant="outline" size={size} onClick={() => setDialog("reschedule")}>
          <CalendarClock /> Reagendar
        </Button>
      )}
      {canChange && (
        <Button variant="ghost" size={size} className="text-destructive hover:bg-destructive/10" onClick={() => setDialog("cancel")}>
          <X /> Cancelar
        </Button>
      )}

      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && close()}
        title="Cancelar agendamento?"
        description={`${a.service.name} em ${formatDateKey(a.date)} às ${a.startTime}. O horário será liberado.`}
        confirmLabel="Cancelar agendamento"
        destructive
        loading={cancel.pending}
        onConfirm={() => cancel.run({ appointmentId: a.id, reason: reason || undefined })}
      >
        <Field label="Motivo (opcional)" htmlFor={`reason-${a.id}`} className="mb-5">
          <Input id={`reason-${a.id}`} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "complete"}
        onOpenChange={(o) => !o && close()}
        title="Concluir atendimento?"
        description={`Marcar ${a.service.name} de ${a.client.name} como concluído.`}
        confirmLabel="Concluir"
        loading={complete.pending}
        onConfirm={() => complete.run(a.id)}
      />

      {dialog === "reschedule" && (
        <RescheduleDialog appointment={a} open onOpenChange={(o) => !o && close()} today={today} barbers={role === "ADMIN" ? barbers : undefined} />
      )}

      <Dialog open={dialog === "details"} onOpenChange={(o) => !o && close()}>
        <DialogContent title="Detalhes do agendamento">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
            <Detail label="Serviço" value={a.service.name} />
            <Detail label="Status" value={<StatusBadge status={a.status} />} />
            <Detail label="Data" value={formatDateKey(a.date)} />
            <Detail label="Horário" value={`${a.startTime} – ${a.endTime}`} />
            <Detail label="Barbeiro" value={a.barber.name} />
            <Detail label="Duração" value={formatDuration(a.service.durationMinutes)} />
            <Detail label="Valor" value={formatCurrency(a.priceCents)} />
            {staff && <Detail label="Cliente" value={a.client.name} />}
            {staff && <Detail label="Telefone" value={formatPhone(a.client.phone)} />}
            {staff && <Detail label="E-mail" value={a.client.email} />}
            {!staff && a.notes && <Detail label="Observações" value={a.notes} wide />}
            {a.cancellationReason && <Detail label="Motivo do cancelamento" value={a.cancellationReason} wide />}
          </dl>
          {staff && (
            <div className="mt-6 border-t pt-5">
              <Field label="Observações" htmlFor={`notes-${a.id}`}>
                <Textarea id={`notes-${a.id}`} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Preferências do cliente, detalhes do atendimento..." />
              </Field>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                disabled={notes === (a.notes ?? "")}
                loading={saveNotes.pending}
                onClick={() => saveNotes.run({ appointmentId: a.id, notes })}
              >
                Salvar observações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="eyebrow !tracking-[0.15em]">{label}</dt>
      <dd className="mt-1.5 break-words">{value}</dd>
    </div>
  );
}
