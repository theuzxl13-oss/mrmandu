import { BookingWizard } from "@/components/booking/booking-wizard";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { getBookingOptions } from "@/server/services/booking-options.service";
import { listClientOptions } from "@/server/services/client.service";

export const metadata = { title: "Novo agendamento" };

/** Barbeiro agenda um cliente na própria agenda (o backend força o barbeiro logado). */
export default async function BarbeiroAgendarPage() {
  const user = await requirePageRole("BARBER");
  const [options, clients] = await Promise.all([getBookingOptions({ limitWindow: false }), listClientOptions(user)]);
  const own = options.barbers.filter((b) => b.id === user.barberId);

  return (
    <div>
      <PageHeader title="Novo agendamento" description="Agende um cliente na sua agenda. O horário já entra como confirmado." />
      {!own.length ? (
        <EmptyState title="Agenda indisponível" description="Seu cadastro de barbeiro está inativo. Fale com o administrador." />
      ) : clients.length ? (
        <BookingWizard {...options} barbers={own} initialBarberId={own[0]!.id} lockBarber clients={clients} successHref="/barbeiro/agenda" />
      ) : (
        <EmptyState title="Nenhum cliente cadastrado" description="O cliente precisa ter uma conta para receber o agendamento." />
      )}
    </div>
  );
}
