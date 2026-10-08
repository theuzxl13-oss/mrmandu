"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { forgotPasswordAction, resetPasswordAction } from "@/server/actions/auth.actions";
import { forgotPasswordSchema, resetPasswordSchema } from "@/validations/auth";
import { Notice } from "./auth-heading";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.input<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const { run, pending } = useAction(forgotPasswordAction, { toastSuccess: false, onSuccess: () => setSent(true) });

  if (sent) {
    return (
      <Notice tone="success">
        Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha. O link é válido por 1 hora.
      </Notice>
    );
  }
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <Field label="E-mail" htmlFor="email" error={form.formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Enviar link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const form = useForm<z.input<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  const { run, pending } = useAction(resetPasswordAction);
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <Field label="Nova senha" htmlFor="password" error={errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
      </Field>
      <Field label="Confirmar senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Redefinir senha
      </Button>
    </form>
  );
}
