"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { maskPhone } from "@/lib/format";
import { registerAction } from "@/server/actions/auth.actions";
import { registerSchema, type RegisterInput } from "@/validations/auth";
import { Notice } from "./auth-heading";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await registerAction(values);
        if (result && !result.ok) {
          setError(result.error);
          if (result.code === "EMAIL_IN_USE") form.setError("email", { message: result.error });
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        setError("Falha de conexão. Verifique sua internet e tente novamente.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="Nome completo" htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
      </Field>
      <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...form.register("email")} />
      </Field>
      <Field label="Telefone" htmlFor="phone" error={errors.phone?.message}>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="(11) 98888-7777"
          aria-invalid={!!errors.phone}
          {...form.register("phone", { onChange: (e) => form.setValue("phone", maskPhone(e.target.value)) })}
        />
      </Field>
      <Field label="Senha" htmlFor="password" error={errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
      </Field>
      <Field label="Confirmar senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" size="lg" className="mt-2 w-full" loading={pending}>
        Criar conta
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar/cliente" className="text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
