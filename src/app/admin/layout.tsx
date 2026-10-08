import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";
import { listBarberOptions } from "@/server/services/barber.service";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("ADMIN");
  // Uma seção de agenda para cada barbeiro ativo
  const barbers = (await listBarberOptions(user)).filter((b) => b.active);
  return (
    <AppShell
      layout="sidebar"
      sidebarLabel="Painel administrativo"
      user={{ name: user.name, email: user.email, roleLabel: "Administrador" }}
      nav={[
        { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
        {
          href: "/admin/agenda",
          label: "Agenda",
          icon: "calendar",
          children: barbers.map((b) => ({ href: `/admin/agenda/${b.id}`, label: b.name })),
        },
        { href: "/admin/agendamentos", label: "Agendamentos", icon: "list" },
        { href: "/admin/clientes", label: "Clientes", icon: "users" },
        { href: "/admin/barbeiros", label: "Barbeiros", icon: "user" },
        { href: "/admin/servicos", label: "Serviços", icon: "scissors" },
        { href: "/admin/planos", label: "Planos & Clube", icon: "layers" },
        { href: "/admin/horarios", label: "Horários", icon: "clock" },
        { href: "/admin/configuracoes", label: "Configurações", icon: "settings" },
      ]}
    >
      {children}
    </AppShell>
  );
}
