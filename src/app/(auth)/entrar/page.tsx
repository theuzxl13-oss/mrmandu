import Link from "next/link";
import { ArrowRight, Scissors, User } from "lucide-react";
import { AuthHeading, Notice } from "@/components/auth/auth-heading";

export const metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const callback = params.callbackUrl ? `?callbackUrl=${encodeURIComponent(params.callbackUrl)}` : "";
  const options = [
    { href: `/entrar/cliente${callback}`, icon: User, title: "Cliente", text: "Agende e gerencie seus horários" },
    { href: `/entrar/equipe${callback}`, icon: Scissors, title: "Barbeiro / Admin", text: "Acesso da equipe" },
  ];
  return (
    <>
      <AuthHeading title="Entrar como" description="Escolha como deseja acessar a plataforma." />
      {params.expirada && <Notice>Sua sessão expirou. Faça login novamente.</Notice>}
      {params.redefinida && <Notice tone="success">Senha redefinida com sucesso. Faça login com a nova senha.</Notice>}
      <div className="space-y-3">
        {options.map(({ href, icon: Icon, title, text }) => (
          <Link
            key={title}
            href={href}
            className="group flex items-center gap-4 rounded-lg border bg-card p-5 transition-all hover:border-foreground/40 hover:bg-accent"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block font-display text-xl uppercase tracking-wide">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </span>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Novo por aqui?{" "}
        <Link href="/cadastro" className="text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </>
  );
}
