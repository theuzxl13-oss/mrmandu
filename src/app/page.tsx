import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { DAYS_OF_WEEK } from "@/config/shop";
import { formatCurrency, formatDuration, formatPhone } from "@/lib/format";
import { ROLE_HOME } from "@/lib/route-access";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { listActiveBarbers } from "@/server/services/barber.service";
import { getWeeklyHours } from "@/server/services/business-hours.service";
import { listActiveServices } from "@/server/services/catalog.service";
import { getShopSettings } from "@/server/services/settings.service";

export const dynamic = "force-dynamic";

const BENEFITS = [
  { title: "Agendamento online", text: "Escolha serviço, barbeiro e horário em poucos toques, 24 horas por dia." },
  { title: "Profissionais experientes", text: "Especialistas em cortes clássicos, degradê e barba na navalha." },
  { title: "Pontualidade", text: "Seu horário é reservado exclusivamente para você. Sem filas, sem espera." },
  { title: "Ambiente premium", text: "Um espaço pensado para o seu conforto, do café à finalização." },
];

export default async function HomePage() {
  const [user, services, barbers, settings, hours] = await Promise.all([
    getCurrentUser(),
    listActiveServices(),
    listActiveBarbers(),
    getShopSettings(),
    getWeeklyHours(null),
  ]);
  const mapQuery = encodeURIComponent([settings.address, settings.city].filter(Boolean).join(", "));
  const whatsapp = settings.whatsapp ?? settings.phone;

  return (
    <>
      <SiteHeader panelHref={user ? ROLE_HOME[user.role] : null} />
      {/* overflow-x-clip: o título monumental "sangra" pela borda sem gerar rolagem horizontal */}
      <main className="overflow-x-clip">
        {/* HERO — bloco tipográfico monumental */}
        <section id="inicio" className="relative flex min-h-[100svh] flex-col justify-end pb-10 pt-28 sm:pb-12">
          {/* Mobile: 4 linhas empilhadas em "parede"; desktop: 2 linhas que sangram pelas bordas */}
          <h1 className="heading-display animate-fade-up whitespace-nowrap text-[23vw] leading-[0.8] sm:text-display">
            <span className="block pl-4 sm:hidden">Seu</span>
            <span className="block pl-4 sm:hidden">estilo.</span>
            <span className="block -translate-x-[3%] sm:hidden">Nosso</span>
            <span className="block -translate-x-[3%] sm:hidden">trabalho.</span>
            <span className="hidden pl-8 sm:block">Seu estilo.</span>
            <span className="hidden -translate-x-[2%] sm:block">Nosso trabalho.</span>
          </h1>
          <div className="mt-10 grid animate-fade-up gap-8 px-4 [animation-delay:250ms] sm:mt-14 sm:px-8 md:grid-cols-12">
            <p className="text-caption uppercase leading-[1.56] md:col-span-4">
              Barbearia premium.
              <br />
              Cortes, barba e acabamento.
            </p>
            <p className="max-w-md text-[18px] leading-[1.33] text-foreground/80 md:col-span-4">
              Agende seu horário na MR.MANDU BARBERS e tenha uma experiência de barbearia premium.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row md:col-span-4 md:flex-col md:items-end lg:flex-row lg:justify-end">
              <Link href="/cliente/agendar" className={buttonVariants({ size: "lg" })}>
                Agendar horário <ArrowRight />
              </Link>
              <Link href="#sobre" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Conhecer a barbearia
              </Link>
            </div>
          </div>
        </section>

        {/* SERVIÇOS — lista "arquivo" */}
        <section id="servicos" className="scroll-mt-16 px-4 py-24 sm:px-8 sm:py-32">
          <SectionHead label="Serviços" index="01" note={`${services.length} serviços · valores atualizados`} />
          {services.length ? (
            <ul className="mt-12 flex flex-col gap-8 sm:mt-16">
              {services.map((s, i) => (
                <li key={s.id}>
                  <Link href={`/cliente/agendar?servico=${s.id}`} className="group grid items-end gap-x-8 gap-y-2 md:grid-cols-12">
                    <h3 className="font-serif text-archive font-normal transition-opacity group-hover:opacity-60 md:col-span-6">{s.name}</h3>
                    <span className="text-caption uppercase text-muted-foreground md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-caption uppercase md:col-span-2">{s.description ?? "—"}</span>
                    <span className="text-caption uppercase md:col-span-1">{formatDuration(s.durationMinutes)}</span>
                    <span className="flex items-center justify-between text-caption font-bold uppercase md:col-span-2 md:justify-end md:gap-3">
                      {formatCurrency(s.priceCents)}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-12 text-caption uppercase text-muted-foreground">Serviços em breve.</p>
          )}
        </section>

        {/* BARBEIROS */}
        <section id="barbeiros" className="scroll-mt-16 px-4 py-24 sm:px-8 sm:py-32">
          <SectionHead label="Barbeiros" index="02" note="A equipe" />
          {barbers.length ? (
            <ul className="mt-12 flex flex-col gap-8 sm:mt-16">
              {barbers.map((b) => (
                <li key={b.id}>
                  <Link href={`/cliente/agendar?barbeiro=${b.id}`} className="group grid items-end gap-x-8 gap-y-3 md:grid-cols-12">
                    <span className="flex items-end gap-5 md:col-span-6">
                      <Avatar name={b.name} src={b.photo} className="h-14 w-14 shrink-0 sm:h-[72px] sm:w-[72px]" />
                      <h3 className="font-serif text-archive font-normal transition-opacity group-hover:opacity-60">{b.name}</h3>
                    </span>
                    <span className="text-caption uppercase md:col-span-3">{b.specialty ?? "Barbeiro"}</span>
                    <span className="text-caption uppercase text-muted-foreground md:col-span-1">{b.bio ? "Perfil" : ""}</span>
                    <span className="flex items-center justify-between text-caption font-bold uppercase md:col-span-2 md:justify-end md:gap-3">
                      Agendar <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-12 text-caption uppercase text-muted-foreground">Equipe em formação.</p>
          )}
        </section>

        {/* SOBRE */}
        <section id="sobre" className="scroll-mt-16 px-4 py-24 sm:px-8 sm:py-32">
          <SectionHead label="Sobre" index="03" note="Mais que um corte" />
          <div className="mt-12 grid gap-10 sm:mt-16 md:grid-cols-12">
            <h2 className="heading-display text-heading md:col-span-7">
              Tradição, precisão
              <br />e estilo.
            </h2>
            <p className="whitespace-pre-line text-[18px] leading-[1.33] text-foreground/80 md:col-span-5">
              {settings.about ??
                "A MR.MANDU BARBERS nasceu da paixão pela barbearia clássica. Unimos técnicas tradicionais a tendências atuais para entregar um atendimento impecável."}
            </p>
          </div>
          <ul className="mt-20 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => (
              <li key={b.title}>
                <p className="text-caption text-muted-foreground">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-[20px] leading-[1.1]">{b.title}</h3>
                <p className="mt-3 text-[14px] leading-[1.4] text-foreground/70">{b.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* LOCALIZAÇÃO + CONTATO */}
        <section id="contato" className="scroll-mt-16 px-4 py-24 sm:px-8 sm:py-32">
          <SectionHead label="Localização & contato" index="04" note={settings.city ?? ""} />
          <div className="mt-12 grid gap-12 sm:mt-16 lg:grid-cols-12">
            <div className="space-y-10 lg:col-span-4">
              {settings.address && (
                <div>
                  <p className="eyebrow">Endereço</p>
                  <p className="mt-2 text-[20px] leading-[1.2]">{settings.address}</p>
                  {settings.city && <p className="text-[20px] leading-[1.2] text-muted-foreground">{settings.city}</p>}
                </div>
              )}
              <div className="flex flex-col gap-2 text-caption uppercase">
                {settings.phone && <a href={`tel:+55${settings.phone}`} className="hover:underline">Telefone · {formatPhone(settings.phone)}</a>}
                {whatsapp && <a href={`https://wa.me/55${whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">WhatsApp ↗</a>}
                {settings.email && <a href={`mailto:${settings.email}`} className="hover:underline">{settings.email}</a>}
                {settings.instagram && <span>{settings.instagram}</span>}
              </div>
              <div>
                <p className="eyebrow mb-3">Horário de funcionamento</p>
                <ul className="flex flex-col gap-1.5 text-[14px]">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const day = hours.days[d];
                    return (
                      <li key={d} className="flex justify-between gap-6">
                        <span className="text-muted-foreground">{DAYS_OF_WEEK[d]?.label}</span>
                        <span className={cn("tabular-nums", !day?.active && "text-muted-foreground")}>
                          {day?.active ? `${day.startTime} – ${day.endTime}` : "Fechado"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="min-h-[360px] bg-secondary lg:col-span-8">
              {mapQuery && (
                <iframe
                  title="Mapa da barbearia"
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                  className="h-full min-h-[360px] w-full grayscale invert-[0.92] contrast-[0.9]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>
          </div>
        </section>

        {/* CTA monumental */}
        <section className="pb-16 pt-24 sm:pt-32">
          <Link href="/cliente/agendar" className="group block">
            <p className="px-4 text-caption uppercase sm:px-8">Pronto para o próximo corte? →</p>
            <p className="heading-display mt-6 whitespace-nowrap pl-4 text-display transition-opacity group-hover:opacity-70 sm:pl-8">
              Agende agora.
            </p>
          </Link>
        </section>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

function SectionHead({ label, index, note }: { label: string; index: string; note?: string }) {
  return (
    <div className="grid grid-cols-12 gap-4 text-caption uppercase">
      <span className="col-span-2 text-muted-foreground md:col-span-1">{index}</span>
      <h2 className="col-span-6 font-bold md:col-span-5">{label}</h2>
      {note && <span className="col-span-4 text-right text-muted-foreground md:col-span-6">{note}</span>}
    </div>
  );
}
