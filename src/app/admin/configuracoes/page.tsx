import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { getShopSettings } from "@/server/services/settings.service";

export const metadata = { title: "Configurações" };

export default async function AdminConfiguracoesPage() {
  await requirePageRole("ADMIN");
  const settings = await getShopSettings();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Configurações" description="Dados da barbearia e regras de funcionamento do agendamento." />
      <SettingsForm settings={settings} />
    </div>
  );
}
