import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenhaPage() {
  return (
    <>
      <AuthHeading title="Esqueci minha senha" description="Informe seu e-mail e enviaremos um link para redefinir a senha." back="/entrar" />
      <ForgotPasswordForm />
    </>
  );
}
