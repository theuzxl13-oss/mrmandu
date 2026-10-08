import { ShieldAlert, Sparkles } from "lucide-react";

/** Avisos vindos de redirecionamentos (permissão insuficiente, boas-vindas...). */
export function FlashNotice({ params }: { params: Record<string, string | string[] | undefined> }) {
  if (params.erro === "permissao") {
    return (
      <div role="alert" className="mb-6 flex items-center gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
        Permissão insuficiente: você foi redirecionado para o seu painel.
      </div>
    );
  }
  if (params.bemvindo) {
    return (
      <div role="status" className="mb-6 flex items-center gap-3 rounded-md border bg-secondary px-4 py-3 text-sm">
        <Sparkles className="h-4 w-4 shrink-0" />
        Conta criada com sucesso. Bem-vindo à MR.MANDU BARBERS!
      </div>
    );
  }
  return null;
}
