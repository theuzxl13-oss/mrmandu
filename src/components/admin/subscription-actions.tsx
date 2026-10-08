"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { activateSubscriptionAction, adminCancelSubscriptionAction, redeemRewardAction } from "@/server/actions/admin.actions";

export function SubscriptionActions({ id, pending }: { id: string; pending: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const activate = useAction(activateSubscriptionAction, { refresh: true });
  const cancel = useAction(adminCancelSubscriptionAction, { refresh: true, onSuccess: () => setConfirm(false) });
  return (
    <div className="flex gap-2">
      {pending && (
        <Button size="sm" variant="secondary" loading={activate.pending} onClick={() => activate.run(id)}>
          <Check /> Ativar
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirm(true)}>
        <X /> Cancelar
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Cancelar assinatura?"
        description="O cliente deixará de ter os benefícios do plano."
        confirmLabel="Cancelar assinatura"
        destructive
        loading={cancel.pending}
        onConfirm={() => cancel.run(id)}
      />
    </div>
  );
}

export function RedeemRewardButton({ clientId, reward, available }: { clientId: string; reward: string; available: number }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction(redeemRewardAction, { refresh: true, onSuccess: () => setOpen(false) });
  return (
    <>
      <Button variant="secondary" disabled={available < 1} onClick={() => setOpen(true)}>
        Registrar resgate ({available})
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Registrar resgate?"
        description={`Confirma a entrega de "${reward}" ao cliente?`}
        confirmLabel="Registrar"
        loading={pending}
        onConfirm={() => run(clientId)}
      />
    </>
  );
}
