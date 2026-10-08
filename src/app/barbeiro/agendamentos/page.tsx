import { AppointmentsList } from "@/components/appointments/appointments-list";
import { PageHeader } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { listActiveServices } from "@/server/services/catalog.service";

export const metadata = { title: "Agendamentos" };

export default async function BarbeiroAgendamentosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("BARBER");
  const services = await listActiveServices();
  return (
    <div>
      <PageHeader title="Meus agendamentos" description="Todos os seus atendimentos, com filtros." />
      <AppointmentsList actor={user} basePath="/barbeiro/agendamentos" rawParams={await searchParams} services={services} />
    </div>
  );
}
