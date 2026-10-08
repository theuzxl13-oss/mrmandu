import { ChangePasswordForm, ProfileForm } from "@/components/auth/profile-forms";
import { PageHeader } from "@/components/ui/misc";
import { requirePageRole } from "@/server/auth/session";
import { getProfile } from "@/server/services/user.service";

export const metadata = { title: "Meus dados" };

export default async function PerfilPage() {
  const user = await requirePageRole("CLIENT");
  const profile = await getProfile(user);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Meus dados" description="Gerencie suas informações e sua senha." />
      <div className="space-y-6">
        <ProfileForm initial={{ name: profile.name, email: profile.email, phone: profile.phone ?? "" }} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
