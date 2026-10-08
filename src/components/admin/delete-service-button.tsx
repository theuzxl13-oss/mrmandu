"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { deleteServiceAction } from "@/server/actions/admin.actions";

export function DeleteServiceButton({ id, name, inUse }: { id: string; name: string; inUse: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction(deleteServiceAction, { refresh: true, onSuccess: () => setOpen(false) });
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
        disabled={inUse}
        title={inUse ? "Serviço com agendamentos: desative em vez de excluir" : undefined}
        aria-label={`Excluir ${name}`}
      >
        <Trash2 />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir serviço?"
        description={`"${name}" será removido permanentemente.`}
        confirmLabel="Excluir"
        destructive
        loading={pending}
        onConfirm={() => run(id)}
      />
    </>
  );
}
