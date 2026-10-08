"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { cancelMySubscriptionAction, requestSubscriptionAction } from "@/server/actions/plan.actions";

export function SubscribeButton({ planId, planName, disabled }: { planId: string; planName: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction(requestSubscriptionAction, { refresh: true, onSuccess: () => setOpen(false) });
  return (
    <>
      <Button size="lg" className="w-full" disabled={disabled} onClick={() => setOpen(true)}>
        Quero este plano
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Assinar ${planName}?`}
        description="Sua solicitação será enviada à barbearia. O plano é ativado após a confirmação do pagamento no balcão."
        confirmLabel="Solicitar plano"
        loading={pending}
        onConfirm={() => run(planId)}
      />
    </>
  );
}

export function CancelSubscriptionButton({ id, pendingOnly }: { id: string; pendingOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction(cancelMySubscriptionAction, { refresh: true, onSuccess: () => setOpen(false) });
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {pendingOnly ? "Cancelar solicitação" : "Cancelar plano"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={pendingOnly ? "Cancelar solicitação?" : "Cancelar plano?"}
        description="Você poderá assinar novamente quando quiser."
        confirmLabel="Cancelar"
        destructive
        loading={pending}
        onConfirm={() => run(id)}
      />
    </>
  );
}
