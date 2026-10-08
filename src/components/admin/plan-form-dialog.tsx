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
import { createPlanAction, updatePlanAction } from "@/server/actions/admin.actions";
import type { PlanDTO } from "@/server/services/plan.service";
import { planSchema, type PlanFormInput, type PlanFormOutput } from "@/validations/catalog";

export function PlanFormDialog({ plan }: { plan?: PlanDTO }) {
  const [open, setOpen] = useState(false);
  const editing = !!plan;
  const defaults: PlanFormInput = {
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    benefits: plan?.benefits.join("\n") ?? "",
    price: plan ? plan.priceCents / 100 : 0,
    active: plan?.active ?? true,
  };
  const form = useForm<PlanFormInput, unknown, PlanFormOutput>({ resolver: zodResolver(planSchema), defaultValues: defaults });
  const { errors } = form.formState;
  const onSuccess = () => setOpen(false);
  const create = useAction(createPlanAction, { refresh: true, onSuccess });
  const update = useAction(updatePlanAction, { refresh: true, onSuccess });
  const submit = form.handleSubmit(() => {
    const raw = form.getValues();
    return editing ? update.run(plan.id, raw) : create.run(raw);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset(defaults); }}>
      {editing ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><Pencil /> Editar</Button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Novo plano</Button>
      )}
      <DialogContent title={editing ? "Editar plano" : "Novo plano"} description={editing ? "Assinaturas existentes mantêm o valor contratado." : undefined}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Nome" htmlFor="p-name" error={errors.name?.message}>
            <Input id="p-name" placeholder="Ex.: Plano Corte Ilimitado" aria-invalid={!!errors.name} {...form.register("name")} />
          </Field>
          <Field label="Descrição" htmlFor="p-desc" error={errors.description?.message}>
            <Textarea id="p-desc" maxLength={300} {...form.register("description")} />
          </Field>
          <Field label="Benefícios (um por linha)" htmlFor="p-benefits" error={errors.benefits?.message}>
            <Textarea id="p-benefits" rows={5} placeholder={"Cortes ilimitados\nPrioridade no agendamento"} {...form.register("benefits")} />
          </Field>
          <Field label="Preço mensal (R$)" htmlFor="p-price" error={errors.price?.message}>
            <Input id="p-price" type="number" step="0.01" min="0" inputMode="decimal" aria-invalid={!!errors.price} {...form.register("price")} />
          </Field>
          <div className="flex items-center justify-between border p-3">
            <span className="text-sm">Ativo (visível para clientes)</span>
            <Switch label="Ativo" checked={form.watch("active") ?? true} onCheckedChange={(v) => form.setValue("active", v)} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={create.pending || update.pending}>{editing ? "Salvar" : "Criar plano"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
