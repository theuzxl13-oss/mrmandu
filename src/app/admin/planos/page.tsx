import Link from "next/link";
import { Layers, Users } from "lucide-react";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { PlanFormDialog } from "@/components/admin/plan-form-dialog";
import { SubscriptionActions } from "@/components/admin/subscription-actions";
import { SUBSCRIPTION_LABEL } from "@/components/client/subscription-labels";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatCurrency, formatInstant, formatPhone } from "@/lib/format";
import { requirePageRole } from "@/server/auth/session";
import { setPlanActiveAction } from "@/server/actions/admin.actions";
import { listAllPlans, listSubscriptions } from "@/server/services/plan.service";
import { getShopSettings } from "@/server/services/settings.service";

export const metadata = { title: "Planos & Clube" };

export default async function AdminPlanosPage() {
  const user = await requirePageRole("ADMIN");
  const [plans, subs, settings] = await Promise.all([listAllPlans(user), listSubscriptions(user), getShopSettings()]);
  const pending = subs.filter((s) => s.status === "PENDING");
  const active = subs.filter((s) => s.status === "ACTIVE");
  const mrr = active.reduce((sum, s) => sum + s.priceCents, 0);

  return (
    <div className="space-y-12">
      <PageHeader title="Planos & Clube" description={`${active.length} assinante(s) ativo(s) · ${formatCurrency(mrr)}/mês recorrente`} actions={<PlanFormDialog />} />

      <section>
        <h2 className="eyebrow mb-4">Planos</h2>
        {plans.length ? (
          <ul className="divide-y border">
            {plans.map((p) => (
              <li key={p.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5 ${p.active ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg">{p.name}</p>
                    {!p.active && <Badge className="text-muted-foreground">Inativo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.benefits.join(" · ") || p.description || "—"}</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-4 w-4" /> {p.activeSubscribers}</span>
                  <span className="w-28 text-lg">{formatCurrency(p.priceCents)}<span className="text-xs text-muted-foreground">/mês</span></span>
                  <ActiveToggle id={p.id} active={p.active} label="plano" action={setPlanActiveAction} deactivateWarning="O plano deixará de aparecer para novos clientes. Assinaturas atuais são mantidas." />
                  <PlanFormDialog plan={p} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Layers />} title="Nenhum plano cadastrado" description="Crie planos mensais para oferecer aos clientes." />
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-4">Assinaturas {pending.length > 0 && `· ${pending.length} aguardando ativação`}</h2>
        {subs.length ? (
          <ul className="divide-y border">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/clientes/${s.client.id}`} className="font-medium hover:underline">{s.client.name}</Link>
                    <Badge className={s.status === "ACTIVE" ? "border-success/50 text-success" : "border-warning/50 text-warning"}>{SUBSCRIPTION_LABEL[s.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.plan.name} · {formatCurrency(s.priceCents)}/mês · {formatPhone(s.client.phone)} · desde {formatInstant(new Date(s.activatedAt ?? s.createdAt), "dd/MM/yyyy")}
                  </p>
                </div>
                <SubscriptionActions id={s.id} pending={s.status === "PENDING"} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura no momento.</p>
        )}
      </section>

      <section className="border p-5 sm:p-6">
        <h2 className="eyebrow">Clube do Mandu</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          A cada <strong className="text-foreground">{settings.loyaltyGoal}</strong> atendimentos concluídos o cliente ganha{" "}
          <strong className="text-foreground">{settings.loyaltyReward}</strong>. Os resgates são registrados na página de cada cliente.
          Altere a regra em <Link href="/admin/configuracoes" className="underline">Configurações</Link>.
        </p>
      </section>
    </div>
  );
}
