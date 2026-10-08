import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("CLIENT");
  return (
    <AppShell
      layout="top"
      user={{ name: user.name, email: user.email, roleLabel: "Cliente" }}
      nav={[
        { href: "/cliente", label: "Meus horários", icon: "calendar", exact: true },
        { href: "/cliente/agendar", label: "Novo agendamento", icon: "plus" },
        { href: "/cliente/perfil", label: "Meus dados", icon: "user" },
      ]}
    >
      {children}
    </AppShell>
  );
}
