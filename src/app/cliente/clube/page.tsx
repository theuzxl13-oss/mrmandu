import { Gift } from "lucide-react";
import { LoyaltyCard } from "@/components/client/loyalty-card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { formatInstant } from "@/lib/format";
import { requirePageRole } from "@/server/auth/session";
import { getLoyaltyStatus } from "@/server/services/loyalty.service";

export const metadata = { title: "Clube do Mandu" };

export default async function ClubePage() {
  const user = await requirePageRole("CLIENT");
  const status = await getLoyaltyStatus(user);
  const steps = [
    { n: "01", title: "Agende e compareça", text: "Cada atendimento concluído na barbearia vale 1 selo no seu cartão." },
    { n: "02", title: `Complete ${status.goal} selos`, text: "Os selos são registrados automaticamente quando o barbeiro conclui o atendimento." },
    { n: "03", title: "Resgate na barbearia", text: `Ganhe ${status.reward}. Basta avisar no balcão — o resgate é registrado pela barbearia.` },
  ];

  return (
    <div className="space-y-10">
      <PageHeader title="Clube do Mandu" description="Fidelidade que vira benefício. Quanto mais você vem, mais você ganha." />
      <LoyaltyCard status={status} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Atendimentos" value={status.completed} hint="concluídos" />
        <StatCard label="Recompensas" value={status.earned} hint="conquistadas" />
        <StatCard label="Resgatadas" value={status.redeemed} />
        <StatCard label="Disponíveis" value={status.available} />
      </div>
      <section>
        <h2 className="eyebrow mb-6">Como funciona</h2>
        <ol className="grid gap-10 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n}>
              <p className="text-caption text-muted-foreground">{s.n}</p>
              <p className="mt-3 text-[20px] leading-[1.1]">{s.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="eyebrow mb-4">Resgates</h2>
        {status.redemptions.length ? (
          <ul className="divide-y border">
            {status.redemptions.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <span className="flex items-center gap-3"><Gift className="h-4 w-4 text-muted-foreground" /> {r.reward}</span>
                <span className="text-muted-foreground">{formatInstant(new Date(r.createdAt), "dd/MM/yyyy")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum resgate ainda.</p>
        )}
      </section>
    </div>
  );
}
