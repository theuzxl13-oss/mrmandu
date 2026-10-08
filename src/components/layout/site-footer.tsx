import Link from "next/link";
import type { ShopSettings } from "@prisma/client";
import { Logo } from "@/components/brand/logo";
import { formatPhone } from "@/lib/format";

export function SiteFooter({ settings }: { settings: ShopSettings }) {
  return (
    <footer className="px-4 pb-8 pt-16 sm:px-8">
      <div className="grid gap-10 text-caption uppercase md:grid-cols-12">
        <div className="md:col-span-6">
          <Logo size="lg" />
        </div>
        <ul className="flex flex-col gap-1.5 md:col-span-3">
          <li><Link href="/#servicos" className="hover:underline">Serviços</Link></li>
          <li><Link href="/#barbeiros" className="hover:underline">Barbeiros</Link></li>
          <li><Link href="/cliente/agendar" className="font-bold hover:underline">Agendar horário</Link></li>
          <li><Link href="/entrar" className="hover:underline">Entrar</Link></li>
        </ul>
        <ul className="flex flex-col gap-1.5 text-muted-foreground md:col-span-3">
          {settings.address && <li>{settings.address}</li>}
          {settings.city && <li>{settings.city}</li>}
          {settings.phone && <li>{formatPhone(settings.phone)}</li>}
          {settings.instagram && <li>{settings.instagram}</li>}
        </ul>
      </div>
      <div className="mt-16 flex flex-col gap-2 text-caption uppercase text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {settings.name}</p>
        <p>Seu estilo. Nosso trabalho.</p>
      </div>
    </footer>
  );
}
