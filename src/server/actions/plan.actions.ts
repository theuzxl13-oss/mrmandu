"use server";

import { cancelSubscription, requestSubscription } from "@/server/services/plan.service";
import { withActor } from "./run-action";

export async function requestSubscriptionAction(planId: unknown) {
  return withActor(["CLIENT"], async (a) => void (await requestSubscription(a, planId)), {
    revalidate: ["/cliente", "/admin"],
    message: "Solicitação enviada! A barbearia ativará seu plano após o pagamento.",
  });
}

export async function cancelMySubscriptionAction(id: unknown) {
  return withActor(["CLIENT"], (a) => cancelSubscription(a, id), {
    revalidate: ["/cliente", "/admin"],
    message: "Plano cancelado.",
  });
}
