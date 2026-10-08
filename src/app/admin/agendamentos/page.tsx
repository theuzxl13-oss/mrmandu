import Link from "next/link";
import { Plus } from "lucide-react";
import { AppointmentsList } from "@/components/appointments/appointments-list";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { listBarberOptions } from "@/server/services/barber.service";
import { listAllServices } from "@/server/services/catalog.service";

export const metadata = { title: "Agendamentos" };

export default async function AdminAgendamentosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("ADMIN");
  const [services, barbers] = await Promise.all([listAllServices(user), listBarberOptions(user)]);
  return (
    <div>
      <PageHeader
        title="Agendamentos"
        description="Crie, confirme, reagende, conclua ou cancele agendamentos."
        actions={<Link href="/admin/agendamentos/novo" className={buttonVariants()}><Plus /> Novo agendamento</Link>}
      />
      <AppointmentsList actor={user} basePath="/admin/agendamentos" rawParams={await searchParams} services={services} barbers={barbers} />
    </div>
  );
}
