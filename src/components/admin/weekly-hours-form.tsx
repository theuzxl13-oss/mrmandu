"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import { DAYS_OF_WEEK } from "@/config/shop";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";
import { clearBarberHoursAction, saveWeeklyHoursAction } from "@/server/actions/admin.actions";
import type { WeeklyDayHours } from "@/server/services/business-hours.service";
import { weeklyHoursSchema, type WeeklyHoursInput } from "@/validations/catalog";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WeeklyHoursForm({ barberId, days, customized }: { barberId: string | null; days: WeeklyDayHours[]; customized: boolean }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const form = useForm<WeeklyHoursInput>({
    resolver: zodResolver(weeklyHoursSchema),
    defaultValues: {
      barberId,
      days: days.map((d) => ({ ...d, breakStart: d.breakStart ?? "", breakEnd: d.breakEnd ?? "" })),
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: "days" });
  const save = useAction(saveWeeklyHoursAction, { refresh: true, onSuccess: () => form.reset(form.getValues()) });
  const clear = useAction(clearBarberHoursAction, { refresh: true, onSuccess: () => setConfirmReset(false) });
  const errors = form.formState.errors.days;

  return (
    <form onSubmit={form.handleSubmit(() => save.run(form.getValues()))} noValidate>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[140px_70px_1fr_1fr] gap-4 border-b px-5 py-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground md:grid">
          <span>Dia</span><span>Aberto</span><span>Expediente</span><span>Intervalo (opcional)</span>
        </div>
        {ORDER.map((dow) => {
          const index = fields.findIndex((f) => f.dayOfWeek === dow);
          if (index < 0) return null;
          const active = form.watch(`days.${index}.active`);
          const dayErr = errors?.[index];
          const message = dayErr?.endTime?.message ?? dayErr?.breakEnd?.message ?? dayErr?.breakStart?.message ?? dayErr?.startTime?.message;
          return (
            <div key={fields[index]!.id} className="border-b px-5 py-4 last:border-0">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[140px_70px_1fr_1fr]">
                <span className="font-medium">{DAYS_OF_WEEK[dow]!.label}</span>
                <Switch label={`${DAYS_OF_WEEK[dow]!.label} aberto`} checked={!!active} onCheckedChange={(v) => form.setValue(`days.${index}.active`, v, { shouldDirty: true })} />
                <div className={cn("col-span-2 flex items-center gap-2 md:col-span-1", !active && "opacity-40")}>
                  <Input type="time" step={900} disabled={!active} aria-label="Início" className="[color-scheme:dark]" {...form.register(`days.${index}.startTime`)} />
                  <span className="text-muted-foreground">–</span>
                  <Input type="time" step={900} disabled={!active} aria-label="Fim" className="[color-scheme:dark]" {...form.register(`days.${index}.endTime`)} />
                </div>
                <div className={cn("col-span-2 flex items-center gap-2 md:col-span-1", !active && "opacity-40")}>
                  <Input type="time" step={900} disabled={!active} aria-label="Início do intervalo" className="[color-scheme:dark]" {...form.register(`days.${index}.breakStart`)} />
                  <span className="text-muted-foreground">–</span>
                  <Input type="time" step={900} disabled={!active} aria-label="Fim do intervalo" className="[color-scheme:dark]" {...form.register(`days.${index}.breakEnd`)} />
                </div>
              </div>
              {active && message && <p role="alert" className="mt-2 text-xs text-destructive">{message}</p>}
              {!active && <p className="mt-2 text-xs text-muted-foreground md:hidden">Fechado</p>}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {barberId && customized ? (
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            <RotateCcw /> Usar horário geral
          </Button>
        ) : <span />}
        <Button type="submit" loading={save.pending}>Salvar horários</Button>
      </div>
      {barberId && (
        <ConfirmDialog
          open={confirmReset}
          onOpenChange={setConfirmReset}
          title="Remover jornada personalizada?"
          description="O barbeiro passará a seguir o horário geral da barbearia."
          confirmLabel="Remover"
          loading={clear.pending}
          onConfirm={() => clear.run(barberId)}
        />
      )}
    </form>
  );
}
