import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Acesso da equipe" };

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { callbackUrl } = await searchParams;
  return (
    <>
      <AuthHeading title="Barbeiro / Admin" description="Acesso exclusivo da equipe MR.MANDU." back="/entrar" />
      <LoginForm portal="staff" callbackUrl={callbackUrl} />
    </>
  );
}
