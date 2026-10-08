import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("CLIENT");
  return (
    <AppShell
      layout="sidebar"
      user={{ name: user.name, email: user.email, roleLabel: "Cliente" }}
      nav={[
        { href: "/cliente", label: "Início", icon: "house", exact: true },
        { href: "/cliente/agendamentos", label: "Agendamentos", icon: "calendar" },
        { href: "/cliente/clube", label: "Clube do Mandu", icon: "card" },
        { href: "/cliente/plano", label: "Plano", icon: "layers" },
        { href: "/cliente/perfil", label: "Perfil", icon: "user" },
      ]}
    >
      {children}
    </AppShell>
  );
}
