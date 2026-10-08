"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { ShopSettings } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { maskPhone } from "@/lib/format";
import { updateSettingsAction } from "@/server/actions/admin.actions";
import { settingsSchema, type SettingsFormInput } from "@/validations/catalog";

export function SettingsForm({ settings }: { settings: Omit<ShopSettings, "updatedAt"> }) {
  const form = useForm<SettingsFormInput, unknown, z.output<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: settings.name,
      phone: maskPhone(settings.phone ?? ""),
      whatsapp: maskPhone(settings.whatsapp ?? ""),
      email: settings.email ?? "",
      instagram: settings.instagram ?? "",
      address: settings.address ?? "",
      city: settings.city ?? "",
      about: settings.about ?? "",
      slotIntervalMinutes: settings.slotIntervalMinutes,
      minAdvanceMinutes: settings.minAdvanceMinutes,
      maxAdvanceDays: settings.maxAdvanceDays,
      cancellationNoticeHours: settings.cancellationNoticeHours,
    },
  });
  const { errors, isDirty } = form.formState;
  const { run, pending } = useAction(updateSettingsAction, { refresh: true, onSuccess: () => form.reset(form.getValues()) });
  const phoneMask = (name: "phone" | "whatsapp") => form.register(name, { onChange: (e) => form.setValue(name, maskPhone(e.target.value), { shouldDirty: true }) });

  return (
    <form onSubmit={form.handleSubmit(() => run(form.getValues()))} noValidate className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Barbearia</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" {...form.register("name")} />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={errors.phone?.message}><Input id="phone" type="tel" {...phoneMask("phone")} /></Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp?.message}><Input id="whatsapp" type="tel" {...phoneMask("whatsapp")} /></Field>
          <Field label="E-mail" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" {...form.register("email")} /></Field>
          <Field label="Instagram" htmlFor="instagram" error={errors.instagram?.message}><Input id="instagram" placeholder="@mrmandubarbers" {...form.register("instagram")} /></Field>
          <Field label="Endereço" htmlFor="address" error={errors.address?.message}><Input id="address" {...form.register("address")} /></Field>
          <Field label="Cidade" htmlFor="city" error={errors.city?.message}><Input id="city" {...form.register("city")} /></Field>
          <Field label="Sobre (exibido na home)" htmlFor="about" error={errors.about?.message} className="sm:col-span-2">
            <Textarea id="about" rows={5} maxLength={1500} {...form.register("about")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Regras de agendamento</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Intervalo entre horários" htmlFor="slot" error={errors.slotIntervalMinutes?.message} hint="Grade exibida ao cliente (ex.: 09:00, 09:30...).">
            <Select id="slot" {...form.register("slotIntervalMinutes")}>
              {[10, 15, 20, 30, 45, 60].map((v) => <option key={v} value={v}>{v} minutos</option>)}
            </Select>
          </Field>
          <Field label="Antecedência mínima (min)" htmlFor="minAdvance" error={errors.minAdvanceMinutes?.message} hint="Tempo mínimo entre agora e o horário reservado pelo cliente.">
            <Input id="minAdvance" type="number" min={0} {...form.register("minAdvanceMinutes")} />
          </Field>
          <Field label="Janela máxima (dias)" htmlFor="maxDays" error={errors.maxAdvanceDays?.message} hint="Até quantos dias à frente o cliente pode agendar.">
            <Input id="maxDays" type="number" min={1} {...form.register("maxAdvanceDays")} />
          </Field>
          <Field label="Prazo de cancelamento (h)" htmlFor="notice" error={errors.cancellationNoticeHours?.message} hint="Cliente só cancela/reagenda com esta antecedência.">
            <Input id="notice" type="number" min={0} {...form.register("cancellationNoticeHours")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={!isDirty}>Salvar configurações</Button>
      </div>
    </form>
  );
}
