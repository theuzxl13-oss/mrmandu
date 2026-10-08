"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar } from "@/components/booking/calendar";
import { SlotPicker, type SlotView } from "@/components/booking/slot-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { formatDateKey } from "@/lib/format";
import type { DateKey } from "@/lib/time";
import { getRescheduleSlotsAction, rescheduleAppointmentAction } from "@/server/actions/appointment.actions";
import type { AppointmentDTO } from "@/server/services/appointment.service";

export interface BarberOption {
  id: string;
  name: string;
  active: boolean;
}

interface Props {
  appointment: AppointmentDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: DateKey;
  /** Apenas admin: permite transferir para outro barbeiro. */
  barbers?: BarberOption[];
}

export function RescheduleDialog({ appointment, open, onOpenChange, today, barbers }: Props) {
  const [date, setDate] = useState<DateKey | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [barberId, setBarberId] = useState(appointment.barber.id);
  const [slots, setSlots] = useState<{ slots: SlotView[]; closed: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const { run, pending } = useAction(rescheduleAppointmentAction, { onSuccess: () => onOpenChange(false), refresh: true });

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setTime(null);
    getRescheduleSlotsAction({
      appointmentId: appointment.id,
      date,
      barberId: barbers ? barberId : undefined,
    })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setSlots(result.data);
        else {
          toast.error(result.error);
          setSlots(null);
        }
      })
      .catch(() => !cancelled && toast.error("Falha de conexão ao carregar horários."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, barberId, appointment.id, barbers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Reagendar"
        description={`${appointment.service.name} · atual: ${formatDateKey(appointment.date)} às ${appointment.startTime}`}
        className="max-w-2xl"
      >
        {barbers && (
          <Field label="Barbeiro" htmlFor="reschedule-barber" className="mb-5">
            <Select id="reschedule-barber" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              {barbers.filter((b) => b.active || b.id === appointment.barber.id).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <Calendar value={date} onChange={setDate} minDate={today} />
          <div>
            {date ? (
              <SlotPicker slots={slots?.slots ?? null} closed={slots?.closed} loading={loading} value={time} onChange={setTime} />
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Selecione uma data para ver os horários.</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            disabled={!date || !time}
            loading={pending}
            onClick={() =>
              date && time && run({ appointmentId: appointment.id, date, time, barberId: barbers ? barberId : undefined })
            }
          >
            Confirmar novo horário
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
