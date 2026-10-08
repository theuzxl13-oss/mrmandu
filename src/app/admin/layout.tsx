import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("ADMIN");
  return (
    <AppShell
      layout="sidebar"
      user={{ name: user.name, email: user.email, roleLabel: "Administrador" }}
      nav={[
        { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
        { href: "/admin/agenda", label: "Agenda", icon: "calendar" },
        { href: "/admin/agendamentos", label: "Agendamentos", icon: "list" },
        { href: "/admin/clientes", label: "Clientes", icon: "users" },
        { href: "/admin/barbeiros", label: "Barbeiros", icon: "user" },
        { href: "/admin/servicos", label: "Serviços", icon: "scissors" },
        { href: "/admin/horarios", label: "Horários", icon: "clock" },
        { href: "/admin/configuracoes", label: "Configurações", icon: "settings" },
      ]}
    >
      {children}
    </AppShell>
  );
}
