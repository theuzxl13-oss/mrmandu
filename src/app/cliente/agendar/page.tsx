import { BookingWizard } from "@/components/booking/booking-wizard";
import { EmptyState } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { getBookingOptions } from "@/server/services/booking-options.service";

export const metadata = { title: "Novo agendamento" };

export default async function AgendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageRole("CLIENT");
  const params = await searchParams;
  const options = await getBookingOptions({ limitWindow: true });

  return (
    <div>
      <p className="eyebrow">Novo agendamento</p>
      <h1 className="heading-display mb-8 mt-2 text-3xl sm:text-4xl">Reserve seu horário</h1>
      {options.services.length && options.barbers.length ? (
        <BookingWizard {...options} initialServiceId={params.servico} initialBarberId={params.barbeiro} successHref="/cliente" />
      ) : (
        <EmptyState title="Agendamentos indisponíveis" description="Não há serviços ou barbeiros disponíveis no momento. Tente novamente mais tarde." />
      )}
    </div>
  );
}
