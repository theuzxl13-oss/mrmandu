import { Info } from "lucide-react";
import { WeeklyHoursForm } from "@/components/admin/weekly-hours-form";
import { PageHeader } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { listBarberOptions } from "@/server/services/barber.service";
import { getWeeklyHours } from "@/server/services/business-hours.service";

export const metadata = { title: "Horários" };

export default async function AdminHorariosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("ADMIN");
  const params = await searchParams;
  const barbers = await listBarberOptions(user);
  const barber = barbers.find((b) => b.id === params.barbeiro) ?? null;
  const hours = await getWeeklyHours(barber?.id ?? null);

  return (
    <div>
      <PageHeader title="Horários" description="Defina quando a barbearia funciona e a jornada de cada barbeiro." />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Escolher agenda">
        {[{ id: null, name: "Barbearia (geral)" }, ...barbers].map((b) => (
          <a
            key={b.id ?? "shop"}
            href={b.id ? `/admin/horarios?barbeiro=${b.id}` : "/admin/horarios"}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${(barber?.id ?? null) === b.id ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {b.name}
          </a>
        ))}
      </nav>
      <div className="mb-6 flex gap-3 rounded-md border bg-secondary/50 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        {barber ? (
          <p>
            Jornada de <strong className="text-foreground">{barber.name}</strong>
            {hours.customized ? "" : " (ainda seguindo o horário geral — salve para personalizar)"}. A jornada é sempre limitada pelo
            horário geral da barbearia: o barbeiro só atende quando a barbearia está aberta e ambos estão disponíveis.
          </p>
        ) : (
          <p>Horário geral da barbearia. Nenhum agendamento é permitido fora destes horários ou durante o intervalo.</p>
        )}
      </div>
      <WeeklyHoursForm key={barber?.id ?? "shop"} barberId={barber?.id ?? null} days={hours.days} customized={hours.customized} />
    </div>
  );
}
