import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";

export default async function BarbeiroLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("BARBER");
  return (
    <AppShell
      layout="top"
      user={{ name: user.name, email: user.email, roleLabel: "Barbeiro" }}
      nav={[
        { href: "/barbeiro", label: "Hoje", icon: "dashboard", exact: true },
        { href: "/barbeiro/agenda", label: "Agenda", icon: "calendar" },
        { href: "/barbeiro/agendamentos", label: "Agendamentos", icon: "list" },
      ]}
    >
      {children}
    </AppShell>
  );
}
