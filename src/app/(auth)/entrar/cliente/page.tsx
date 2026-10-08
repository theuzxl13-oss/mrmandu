import { AuthHeading, Notice } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Login do cliente" };

export default async function ClientLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { callbackUrl, redefinida } = await searchParams;
  return (
    <>
      <AuthHeading title="Área do cliente" description="Entre para agendar e acompanhar seus horários." back="/entrar" />
      {redefinida && <Notice tone="success">Senha redefinida. Entre com a nova senha.</Notice>}
      <LoginForm portal="client" callbackUrl={callbackUrl} />
    </>
  );
}
