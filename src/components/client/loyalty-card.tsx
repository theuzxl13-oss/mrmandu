import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { LoyaltyStatus } from "@/server/services/loyalty.service";

/** Cartão de selos do Clube do Mandu. */
export function LoyaltyCard({ status, compact }: { status: LoyaltyStatus; compact?: boolean }) {
  const remaining = status.goal - status.stamps;
  return (
    <div className="border bg-background p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Clube do Mandu</p>
          <p className={cn("mt-3 heading-display", compact ? "text-3xl" : "text-heading")}>
            {status.stamps}
            <span className="text-muted-foreground">/{status.goal}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {remaining === status.goal && status.completed === 0
              ? `Conclua ${status.goal} atendimentos e ganhe ${status.reward}.`
              : `Faltam ${remaining} atendimento${remaining === 1 ? "" : "s"} para ${status.reward}.`}
          </p>
        </div>
        {!compact && <Logo size="sm" />}
      </div>
      <ol className={cn("mt-6 grid gap-2", compact ? "grid-cols-5" : "grid-cols-5 sm:grid-cols-10", status.goal > 10 && "grid-cols-6 sm:grid-cols-10")} aria-label={`${status.stamps} de ${status.goal} selos`}>
        {Array.from({ length: status.goal }, (_, i) => {
          const filled = i < status.stamps;
          return (
            <li
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center border text-caption tabular-nums",
                filled ? "border-foreground bg-foreground text-background" : "border-dashed text-muted-foreground",
              )}
            >
              {filled ? <Check className="h-4 w-4" /> : i + 1}
            </li>
          );
        })}
      </ol>
      {status.available > 0 && (
        <p className="mt-6 border border-foreground px-4 py-3 text-caption font-bold uppercase">
          Você tem {status.available} recompensa{status.available === 1 ? "" : "s"} disponível{status.available === 1 ? "" : "is"}: {status.reward}. Apresente na barbearia.
        </p>
      )}
    </div>
  );
}
