import Link from "next/link";
import { AuthHeading, Notice } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata = { title: "Redefinir senha" };

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <AuthHeading title="Nova senha" description="Crie uma nova senha para sua conta." back="/entrar" />
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Notice tone="error">
          Link inválido. <Link href="/esqueci-senha" className="underline">Solicite uma nova redefinição.</Link>
        </Notice>
      )}
    </>
  );
}
