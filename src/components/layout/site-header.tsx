"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#inicio", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#barbeiros", label: "Barbeiros" },
  { href: "/#sobre", label: "Sobre" },
  { href: "/#contato", label: "Contato" },
];

export function SiteHeader({ panelHref }: { panelHref: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled || open ? "bg-background" : "bg-transparent",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Link href="/" aria-label="MR.MANDU BARBERS — início" onClick={() => setOpen(false)}>
          <Logo size="sm" tagline />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-caption uppercase text-foreground/70 transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-8 lg:flex">
          <Link href={panelHref ?? "/entrar"} className="text-caption uppercase text-foreground/70 transition-colors hover:text-foreground">
            {panelHref ? "Meu painel" : "Entrar"}
          </Link>
          <Link href="/cliente/agendar" className="text-caption font-bold uppercase underline-offset-4 hover:underline">
            Agendar horário
          </Link>
        </div>

        <button
          type="button"
          className="-mr-2 rounded-md p-2 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="h-[calc(100dvh-4rem)] animate-fade-in overflow-y-auto border-t bg-background lg:hidden">
          <nav className="flex flex-col px-4 py-6" aria-label="Principal (mobile)">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-2 text-[44px] uppercase leading-[0.95] tracking-[-0.02em]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-8 flex flex-col gap-3">
              <Link href="/cliente/agendar" onClick={() => setOpen(false)} className={buttonVariants({ size: "lg" })}>
                Agendar horário
              </Link>
              <Link href={panelHref ?? "/entrar"} onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline", size: "lg" })}>
                {panelHref ? "Meu painel" : "Entrar"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
