"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { maskPhone } from "@/lib/format";
import { changePasswordAction, updateProfileAction } from "@/server/actions/profile.actions";
import { changePasswordSchema, profileSchema } from "@/validations/auth";

export function ProfileForm({ initial }: { initial: { name: string; email: string; phone: string } }) {
  const form = useForm<z.input<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: initial.name, phone: maskPhone(initial.phone) },
  });
  const { errors, isDirty } = form.formState;
  const { run, pending } = useAction(updateProfileAction, { refresh: true, onSuccess: () => form.reset(form.getValues()) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados pessoais</CardTitle>
        <CardDescription>Mantenha seu contato atualizado para receber avisos sobre seus horários.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-4">
          <Field label="E-mail" htmlFor="email" hint="Para alterar o e-mail, entre em contato com a barbearia.">
            <Input id="email" value={initial.email} disabled readOnly />
          </Field>
          <Field label="Nome completo" htmlFor="name" error={errors.name?.message}>
            <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              aria-invalid={!!errors.phone}
              {...form.register("phone", { onChange: (e) => form.setValue("phone", maskPhone(e.target.value), { shouldDirty: true }) })}
            />
          </Field>
          <Button type="submit" loading={pending} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const form = useForm<z.input<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  // Trocar a senha invalida as sessões existentes (inclusive esta).
  const { run, pending } = useAction(changePasswordAction, {
    onSuccess: () => router.push("/sair"),
    onError: (r) => r.code === "WRONG_PASSWORD" && form.setError("currentPassword", { message: r.error }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar senha</CardTitle>
        <CardDescription>Após a alteração, você precisará entrar novamente.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-4">
          <Field label="Senha atual" htmlFor="currentPassword" error={errors.currentPassword?.message}>
            <Input id="currentPassword" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...form.register("currentPassword")} />
          </Field>
          <Field label="Nova senha" htmlFor="newPassword" error={errors.newPassword?.message} hint="Mínimo de 8 caracteres, com letras e números.">
            <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...form.register("newPassword")} />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
          </Field>
          <Button type="submit" variant="outline" loading={pending}>
            Alterar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
