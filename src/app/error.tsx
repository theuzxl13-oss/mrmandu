"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

/** Erro inesperado: mensagem amigável, sem detalhes internos. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-6 p-4 sm:p-8">
      <p className="text-caption uppercase text-muted-foreground">Erro {error.digest ? `· ${error.digest}` : ""}</p>
      <h1 className="heading-display text-heading">Algo deu errado.</h1>
      <p className="max-w-md text-muted-foreground">Não foi possível carregar esta página. Verifique sua conexão e tente novamente.</p>
      <div className="flex gap-2">
        <Button size="lg" onClick={reset}>Tentar novamente</Button>
        <Link href="/" className={buttonVariants({ size: "lg", variant: "outline" })}>Início</Link>
      </div>
    </main>
  );
}
