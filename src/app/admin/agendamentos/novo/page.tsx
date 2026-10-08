import { BookingWizard } from "@/components/booking/booking-wizard";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { getBookingOptions } from "@/server/services/booking-options.service";
import { listClientOptions } from "@/server/services/client.service";

export const metadata = { title: "Novo agendamento" };

export default async function AdminNovoAgendamentoPage() {
  const user = await requirePageRole("ADMIN");
  const [options, clients] = await Promise.all([getBookingOptions({ limitWindow: false }), listClientOptions(user)]);
  return (
    <div>
      <PageHeader title="Novo agendamento" description="Agende em nome de um cliente. O agendamento já é criado como confirmado." />
      {clients.length ? (
        <BookingWizard {...options} clients={clients} successHref="/admin/agendamentos" />
      ) : (
        <EmptyState title="Nenhum cliente cadastrado" description="O cliente precisa ter uma conta para receber o agendamento." />
      )}
    </div>
  );
}
