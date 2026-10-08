"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

interface Options<T> {
  onSuccess?: (data: T) => void;
  onError?: (result: Extract<ActionResult<T>, { ok: false }>) => void;
  /** Exibe toast de sucesso com a mensagem retornada pela action (padrão: true). */
  toastSuccess?: boolean;
  refresh?: boolean;
}

/**
 * Executa server actions com estado de carregamento, toasts e tratamento
 * uniforme de sessão expirada / falha de conexão.
 */
export function useAction<TArgs extends unknown[], T>(
  action: (...args: TArgs) => Promise<ActionResult<T>>,
  opts: Options<T> = {},
) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = useCallback(
    (...args: TArgs) =>
      new Promise<ActionResult<T> | null>((resolve) => {
        startTransition(async () => {
          try {
            const result = await action(...args);
            if (result.ok) {
              if (opts.toastSuccess !== false && result.message) toast.success(result.message);
              opts.onSuccess?.(result.data);
              if (opts.refresh) router.refresh();
            } else {
              toast.error(result.error);
              opts.onError?.(result);
              if (result.code === "UNAUTHENTICATED") router.push("/sair?expirada=1");
            }
            resolve(result);
          } catch (error) {
            // Redirecionamentos do Next também chegam aqui e devem seguir normalmente.
            if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
            toast.error("Falha de conexão. Verifique sua internet e tente novamente.");
            resolve(null);
          }
        });
      }),
    [action, opts, router],
  );

  return { run, pending };
}
