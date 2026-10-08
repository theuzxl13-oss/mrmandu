import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh overflow-x-clip lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between p-8 lg:flex">
        <Link href="/" className="self-start">
          <Logo size="sm" tagline />
        </Link>
        <p className="heading-display -ml-[0.05em] whitespace-nowrap text-[clamp(5rem,9.5vw,9rem)] leading-[0.8]">
          Seu
          <br />
          estilo.
          <br />
          Nosso
          <br />
          trabalho.
        </p>
        <p className="text-caption uppercase leading-[1.56] text-muted-foreground">
          Agende, reagende e acompanhe
          <br />
          seus horários em um só lugar.
        </p>
      </aside>
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <Link href="/" className="mb-10 self-start lg:hidden">
          <Logo size="sm" tagline />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-10">{children}</div>
      </main>
    </div>
  );
}
