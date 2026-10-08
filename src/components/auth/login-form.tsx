"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { loginAction } from "@/server/actions/auth.actions";
import { emailSchema } from "@/validations/common";
import type { LoginPortal } from "@/types/auth";
import { Notice } from "./auth-heading";

const schema = z.object({ email: emailSchema, password: z.string().min(1, "Informe a senha.") });
type Values = z.infer<typeof schema>;

export function LoginForm({ portal, callbackUrl }: { portal: LoginPortal; callbackUrl?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await loginAction({ ...values, portal }, callbackUrl);
        if (result && !result.ok) setError(result.error);
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        setError("Falha de conexão. Verifique sua internet e tente novamente.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="seu@email.com" aria-invalid={!!errors.email} {...form.register("email")} />
      </Field>
      <Field label="Senha" htmlFor="password" error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-11"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <div className="flex justify-end">
        <Link href="/esqueci-senha" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Entrar
      </Button>
      {portal === "client" && (
        <Link href="/cadastro" className="flex h-12 w-full items-center justify-center rounded-md border text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:bg-accent">
          Criar conta
        </Link>
      )}
    </form>
  );
}
