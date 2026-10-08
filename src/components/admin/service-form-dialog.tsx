"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import { useAction } from "@/hooks/use-action";
import { createServiceAction, updateServiceAction } from "@/server/actions/admin.actions";
import type { ServiceDTO } from "@/server/services/catalog.service";
import { serviceSchema, type ServiceFormInput, type ServiceFormOutput } from "@/validations/catalog";

export function ServiceFormDialog({ service }: { service?: ServiceDTO }) {
  const [open, setOpen] = useState(false);
  const editing = !!service;
  const defaults: ServiceFormInput = {
    name: service?.name ?? "",
    description: service?.description ?? "",
    price: service ? service.priceCents / 100 : 0,
    durationMinutes: service?.durationMinutes ?? 30,
    active: service?.active ?? true,
  };
  const form = useForm<ServiceFormInput, unknown, ServiceFormOutput>({ resolver: zodResolver(serviceSchema), defaultValues: defaults });
  const { errors } = form.formState;
  const onSuccess = () => setOpen(false);
  const create = useAction(createServiceAction, { refresh: true, onSuccess });
  const update = useAction(updateServiceAction, { refresh: true, onSuccess });

  // Envia os valores crus do formulário: o servidor revalida com o mesmo schema.
  const submit = form.handleSubmit(() => {
    const raw = form.getValues();
    return editing ? update.run(service.id, raw) : create.run(raw);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset(defaults); }}>
      {editing ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Editar ${service.name}`}><Pencil /> Editar</Button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Novo serviço</Button>
      )}
      <DialogContent title={editing ? "Editar serviço" : "Novo serviço"} description={editing ? "Agendamentos já feitos mantêm o preço e a duração originais." : undefined}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Nome" htmlFor="s-name" error={errors.name?.message}>
            <Input id="s-name" aria-invalid={!!errors.name} {...form.register("name")} />
          </Field>
          <Field label="Descrição" htmlFor="s-desc" error={errors.description?.message}>
            <Textarea id="s-desc" maxLength={300} {...form.register("description")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço (R$)" htmlFor="s-price" error={errors.price?.message}>
              <Input id="s-price" type="number" step="0.01" min="0" inputMode="decimal" aria-invalid={!!errors.price} {...form.register("price")} />
            </Field>
            <Field label="Duração (min)" htmlFor="s-duration" error={errors.durationMinutes?.message}>
              <Input id="s-duration" type="number" step="5" min="5" inputMode="numeric" aria-invalid={!!errors.durationMinutes} {...form.register("durationMinutes")} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm">Ativo (visível para agendamento)</span>
            <Switch label="Ativo" checked={form.watch("active") ?? true} onCheckedChange={(v) => form.setValue("active", v)} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={create.pending || update.pending}>{editing ? "Salvar" : "Criar serviço"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
