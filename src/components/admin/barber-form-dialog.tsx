"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import { useAction } from "@/hooks/use-action";
import { maskPhone } from "@/lib/format";
import { createBarberAction, updateBarberAction } from "@/server/actions/admin.actions";
import type { AdminBarberDTO } from "@/server/services/barber.service";
import { createBarberSchema, updateBarberSchema, type BarberFormInput } from "@/validations/catalog";

export function BarberFormDialog({ barber }: { barber?: AdminBarberDTO }) {
  const [open, setOpen] = useState(false);
  const editing = !!barber;
  const defaults: BarberFormInput = {
    name: barber?.name ?? "",
    email: barber?.email ?? "",
    phone: maskPhone(barber?.phone ?? ""),
    photo: barber?.photo ?? "",
    specialty: barber?.specialty ?? "",
    bio: barber?.bio ?? "",
    active: barber?.active ?? true,
    password: "",
  };
  const form = useForm<BarberFormInput, unknown, z.output<typeof updateBarberSchema>>({
    resolver: zodResolver(editing ? updateBarberSchema : createBarberSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const onSuccess = () => {
    setOpen(false);
    form.reset(editing ? form.getValues() : defaults);
  };
  const create = useAction(createBarberAction, { refresh: true, onSuccess });
  const update = useAction(updateBarberAction, { refresh: true, onSuccess });
  const onError = (r: { code?: string; error: string }) => r.code === "EMAIL_IN_USE" && form.setError("email", { message: r.error });

  // Envia os valores crus: o servidor revalida com o mesmo schema.
  const submit = form.handleSubmit(async () => {
    const values = form.getValues();
    const result = editing ? await update.run(barber.id, values) : await create.run(values);
    if (result && !result.ok) onError(result);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset(defaults); }}>
      {editing ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Pencil /> Editar</Button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Novo barbeiro</Button>
      )}
      <DialogContent title={editing ? "Editar barbeiro" : "Novo barbeiro"} description={editing ? undefined : "Cria o acesso do barbeiro ao painel."}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Nome" htmlFor="b-name" error={errors.name?.message}>
            <Input id="b-name" aria-invalid={!!errors.name} {...form.register("name")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail" htmlFor="b-email" error={errors.email?.message}>
              <Input id="b-email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
            </Field>
            <Field label="Telefone" htmlFor="b-phone" error={errors.phone?.message}>
              <Input id="b-phone" type="tel" aria-invalid={!!errors.phone} {...form.register("phone", { onChange: (e) => form.setValue("phone", maskPhone(e.target.value)) })} />
            </Field>
          </div>
          <Field label="Especialidade" htmlFor="b-specialty" error={errors.specialty?.message}>
            <Input id="b-specialty" placeholder="Ex.: Degradê e barba" {...form.register("specialty")} />
          </Field>
          <Field label="Foto (URL https)" htmlFor="b-photo" error={errors.photo?.message} hint="Opcional. Sem foto, exibimos as iniciais.">
            <Input id="b-photo" type="url" placeholder="https://..." aria-invalid={!!errors.photo} {...form.register("photo")} />
          </Field>
          <Field label="Bio" htmlFor="b-bio" error={errors.bio?.message}>
            <Textarea id="b-bio" maxLength={400} {...form.register("bio")} />
          </Field>
          <Field
            label={editing ? "Nova senha (opcional)" : "Senha inicial"}
            htmlFor="b-password"
            error={errors.password?.message}
            hint={editing ? "Deixe em branco para manter a atual. Alterar encerra as sessões do barbeiro." : "Mínimo de 8 caracteres, com letras e números."}
          >
            <Input id="b-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
          </Field>
          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm">Ativo (aceita agendamentos)</span>
            <Switch label="Ativo" checked={form.watch("active") ?? true} onCheckedChange={(v) => form.setValue("active", v, { shouldDirty: true })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={create.pending || update.pending}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
