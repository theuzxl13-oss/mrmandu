import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col justify-between overflow-x-clip p-4 sm:p-8">
      <Link href="/"><Logo size="sm" tagline /></Link>
      <div>
        <p className="heading-display whitespace-nowrap text-display">404.</p>
        <p className="mt-6 text-caption uppercase">Página não encontrada.</p>
      </div>
      <Link href="/" className={buttonVariants({ size: "lg", className: "self-start" })}>Voltar ao início</Link>
    </main>
  );
}
