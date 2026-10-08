import { Scissors } from "lucide-react";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { DeleteServiceButton } from "@/components/admin/delete-service-button";
import { ServiceFormDialog } from "@/components/admin/service-form-dialog";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatCurrency, formatDuration } from "@/lib/format";
import { requirePageRole } from "@/server/auth/session";
import { setServiceActiveAction } from "@/server/actions/admin.actions";
import { listAllServices } from "@/server/services/catalog.service";

export const metadata = { title: "Serviços" };

export default async function AdminServicosPage() {
  const user = await requirePageRole("ADMIN");
  const services = await listAllServices(user);
  return (
    <div>
      <PageHeader title="Serviços" description="Serviços, preços e duração exibidos no agendamento." actions={<ServiceFormDialog />} />
      {services.length === 0 ? (
        <EmptyState icon={<Scissors />} title="Nenhum serviço cadastrado" description="Crie o primeiro serviço para liberar os agendamentos." />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {services.map((s) => (
            <li key={s.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5 ${s.active ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg uppercase tracking-wide">{s.name}</p>
                  {!s.active && <Badge className="text-muted-foreground">Inativo</Badge>}
                </div>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{s.appointmentsCount} agendamento(s)</p>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="text-sm text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
                <span className="w-24 font-display text-xl">{formatCurrency(s.priceCents)}</span>
                <ActiveToggle id={s.id} active={s.active} label="serviço" action={setServiceActiveAction} deactivateWarning="O serviço deixará de aparecer para novos agendamentos. Agendamentos existentes são mantidos." />
                <ServiceFormDialog service={s} />
                <DeleteServiceButton id={s.id} name={s.name} inUse={s.appointmentsCount > 0} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
