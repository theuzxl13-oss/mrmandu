import { AuthHeading } from "@/components/auth/auth-heading";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <>
      <AuthHeading title="Criar conta" description="Cadastre-se para agendar seus horários." back="/entrar" />
      <RegisterForm />
    </>
  );
}
