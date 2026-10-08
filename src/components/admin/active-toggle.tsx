"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/action-result";

interface Props {
  id: string;
  active: boolean;
  label: string;
  action: (input: { id: string; active: boolean }) => Promise<ActionResult<void>>;
  /** Mensagem de confirmação ao desativar. */
  deactivateWarning?: string;
}

/** Interruptor ativo/inativo com confirmação ao desativar. */
export function ActiveToggle({ id, active, label, action, deactivateWarning }: Props) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useAction(action, { refresh: true, onSuccess: () => setConfirming(false) });
  return (
    <>
      <Switch
        checked={active}
        disabled={pending}
        label={`${active ? "Desativar" : "Ativar"} ${label}`}
        onCheckedChange={(next) => (next || !deactivateWarning ? run({ id, active: next }) : setConfirming(true))}
      />
      {deactivateWarning && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={`Desativar ${label}?`}
          description={deactivateWarning}
          confirmLabel="Desativar"
          destructive
          loading={pending}
          onConfirm={() => run({ id, active: false })}
        />
      )}
    </>
  );
}
