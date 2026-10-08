import { Check, Layers } from "lucide-react";
import { CancelSubscriptionButton, SubscribeButton } from "@/components/client/plan-actions";
import { SUBSCRIPTION_LABEL } from "@/components/client/subscription-labels";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatCurrency, formatInstant } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requirePageRole } from "@/server/auth/session";
import { getMySubscription, listActivePlans } from "@/server/services/plan.service";

export const metadata = { title: "Plano" };

export default async function PlanoPage() {
  const user = await requirePageRole("CLIENT");
  const [plans, subscription] = await Promise.all([listActivePlans(), getMySubscription(user)]);

  return (
    <div className="space-y-10">
      <PageHeader title="Plano" description="Assinatura mensal para quem mantém o visual sempre em dia." />

      {subscription && (
        <section className="border p-5 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Seu plano</p>
              <p className="mt-3 heading-display text-heading">{subscription.plan.name}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Badge className={subscription.status === "ACTIVE" ? "border-success/50 text-success" : "border-warning/50 text-warning"}>
                  {SUBSCRIPTION_LABEL[subscription.status]}
                </Badge>
                <span>{formatCurrency(subscription.priceCents)}/mês</span>
                <span>
                  {subscription.activatedAt
                    ? `Ativo desde ${formatInstant(new Date(subscription.activatedAt), "dd/MM/yyyy")}`
                    : `Solicitado em ${formatInstant(new Date(subscription.createdAt), "dd/MM/yyyy")}`}
                </span>
              </div>
              {subscription.status === "PENDING" && (
                <p className="mt-4 max-w-lg text-sm text-muted-foreground">
                  Sua solicitação foi recebida. Finalize o pagamento na barbearia para ativar o plano.
                </p>
              )}
            </div>
            <CancelSubscriptionButton id={subscription.id} pendingOnly={subscription.status === "PENDING"} />
          </div>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-6">{subscription ? "Outros planos" : "Escolha seu plano"}</h2>
        {plans.length ? (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((p) => {
              const current = subscription?.plan.id === p.id;
              return (
                <li key={p.id} className={cn("flex flex-col border p-6 sm:p-8", current && "border-foreground")}>
                  <p className="font-serif text-4xl">{p.name}</p>
                  {p.description && <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>}
                  <p className="mt-8 text-[clamp(2.5rem,5vw,3.625rem)] leading-none tracking-[-0.03em]">
                    {formatCurrency(p.priceCents)}
                    <span className="text-base text-muted-foreground">/mês</span>
                  </p>
                  {p.benefits.length > 0 && (
                    <ul className="mt-8 flex-1 space-y-3 text-sm">
                      {p.benefits.map((b) => (
                        <li key={b} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {b}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-8">
                    {current ? (
                      <p className="border px-4 py-3 text-center text-caption font-bold uppercase">Seu plano atual</p>
                    ) : (
                      <SubscribeButton planId={p.id} planName={p.name} disabled={!!subscription} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<Layers />} title="Nenhum plano disponível" description="Em breve a barbearia divulgará os planos mensais." />
        )}
        {subscription && plans.length > 1 && (
          <p className="mt-4 text-sm text-muted-foreground">Para trocar de plano, cancele o atual e solicite o novo.</p>
        )}
      </section>
    </div>
  );
}
