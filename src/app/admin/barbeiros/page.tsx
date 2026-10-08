import Link from "next/link";
import { Clock, Mail, Phone, UserX } from "lucide-react";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { BarberFormDialog } from "@/components/admin/barber-form-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatPhone } from "@/lib/format";
import { requirePageRole } from "@/server/auth/session";
import { setBarberActiveAction } from "@/server/actions/admin.actions";
import { listAllBarbers } from "@/server/services/barber.service";

export const metadata = { title: "Barbeiros" };

export default async function AdminBarbeirosPage() {
  const user = await requirePageRole("ADMIN");
  const barbers = await listAllBarbers(user);
  return (
    <div>
      <PageHeader title="Barbeiros" description="Equipe, especialidades e jornadas de trabalho." actions={<BarberFormDialog />} />
      {barbers.length === 0 ? (
        <EmptyState icon={<UserX />} title="Nenhum barbeiro cadastrado" description="Cadastre o primeiro barbeiro para começar a receber agendamentos." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((b) => (
            <li key={b.id} className={`flex flex-col rounded-lg border bg-card p-5 ${b.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <Avatar name={b.name} src={b.photo} className="h-14 w-14 text-base" />
                  <div>
                    <p className="font-display text-lg uppercase tracking-wide">{b.name}</p>
                    <p className="text-sm text-muted-foreground">{b.specialty ?? "—"}</p>
                  </div>
                </div>
                <ActiveToggle
                  id={b.id}
                  active={b.active}
                  label="barbeiro"
                  action={setBarberActiveAction}
                  deactivateWarning={`O barbeiro deixará de receber agendamentos e não poderá entrar no painel.${b.upcomingCount ? ` Ele possui ${b.upcomingCount} agendamento(s) futuro(s), que devem ser reagendados.` : ""}`}
                />
              </div>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {b.email}</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {formatPhone(b.phone)}</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> {b.hasCustomHours ? "Jornada personalizada" : "Segue o horário geral"}</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className={b.active ? "" : "text-muted-foreground"}>{b.active ? "Ativo" : "Inativo"}</Badge>
                <Badge className="text-muted-foreground">{b.upcomingCount} futuros</Badge>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <BarberFormDialog barber={b} />
                <Link href={`/admin/horarios?barbeiro=${b.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  <Clock /> Horários
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
