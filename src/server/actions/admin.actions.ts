"use server";

import * as barbers from "@/server/services/barber.service";
import * as catalog from "@/server/services/catalog.service";
import * as clients from "@/server/services/client.service";
import { clearBarberHours, saveWeeklyHours } from "@/server/services/business-hours.service";
import { updateShopSettings } from "@/server/services/settings.service";
import { redeemReward } from "@/server/services/loyalty.service";
import * as plans from "@/server/services/plan.service";
import { idSchema } from "@/validations/common";
import { withActor } from "./run-action";

const ADMIN = ["ADMIN"] as const;
const PUBLIC_AND_ADMIN = ["/", "/admin"];

// Serviços
export async function createServiceAction(input: unknown) {
  return withActor([...ADMIN], (a) => catalog.createService(a, input), { revalidate: PUBLIC_AND_ADMIN, message: "Serviço criado." });
}
export async function updateServiceAction(id: unknown, input: unknown) {
  return withActor([...ADMIN], (a) => catalog.updateService(a, id, input), { revalidate: PUBLIC_AND_ADMIN, message: "Serviço atualizado." });
}
export async function setServiceActiveAction(input: unknown) {
  return withActor([...ADMIN], (a) => catalog.setServiceActive(a, input), { revalidate: PUBLIC_AND_ADMIN, message: "Status atualizado." });
}
export async function deleteServiceAction(id: unknown) {
  return withActor([...ADMIN], (a) => catalog.deleteService(a, id), { revalidate: PUBLIC_AND_ADMIN, message: "Serviço excluído." });
}

// Barbeiros
export async function createBarberAction(input: unknown) {
  return withActor([...ADMIN], async (a) => void (await barbers.createBarber(a, input)), { revalidate: PUBLIC_AND_ADMIN, message: "Barbeiro cadastrado." });
}
export async function updateBarberAction(id: unknown, input: unknown) {
  return withActor([...ADMIN], (a) => barbers.updateBarber(a, id, input), { revalidate: PUBLIC_AND_ADMIN, message: "Barbeiro atualizado." });
}
export async function setBarberActiveAction(input: unknown) {
  return withActor([...ADMIN], (a) => barbers.setBarberActive(a, input), { revalidate: PUBLIC_AND_ADMIN, message: "Status atualizado." });
}

// Clientes
export async function setClientActiveAction(input: unknown) {
  return withActor([...ADMIN], (a) => clients.setClientActive(a, input), { revalidate: ["/admin"], message: "Status atualizado." });
}

// Horários e configurações
export async function saveWeeklyHoursAction(input: unknown) {
  return withActor([...ADMIN], (a) => saveWeeklyHours(a, input), { revalidate: PUBLIC_AND_ADMIN, message: "Horários salvos." });
}
export async function clearBarberHoursAction(barberId: unknown) {
  return withActor([...ADMIN], (a) => clearBarberHours(a, idSchema.parse(barberId)), {
    revalidate: ["/admin"],
    message: "O barbeiro agora segue o horário geral.",
  });
}
export async function updateSettingsAction(input: unknown) {
  return withActor([...ADMIN], async (a) => void (await updateShopSettings(a, input)), { revalidate: PUBLIC_AND_ADMIN, message: "Configurações salvas." });
}

// Planos e assinaturas
export async function createPlanAction(input: unknown) {
  return withActor([...ADMIN], async (a) => void (await plans.createPlan(a, input)), { revalidate: ["/admin", "/cliente"], message: "Plano criado." });
}
export async function updatePlanAction(id: unknown, input: unknown) {
  return withActor([...ADMIN], (a) => plans.updatePlan(a, id, input), { revalidate: ["/admin", "/cliente"], message: "Plano atualizado." });
}
export async function setPlanActiveAction(input: unknown) {
  return withActor([...ADMIN], (a) => plans.setPlanActive(a, input), { revalidate: ["/admin", "/cliente"], message: "Status atualizado." });
}
export async function activateSubscriptionAction(id: unknown) {
  return withActor([...ADMIN], (a) => plans.activateSubscription(a, id), { revalidate: ["/admin", "/cliente"], message: "Assinatura ativada." });
}
export async function adminCancelSubscriptionAction(id: unknown) {
  return withActor([...ADMIN], (a) => plans.cancelSubscription(a, id), { revalidate: ["/admin", "/cliente"], message: "Assinatura cancelada." });
}

// Clube do Mandu
export async function redeemRewardAction(clientId: unknown) {
  return withActor([...ADMIN], (a) => redeemReward(a, clientId), { revalidate: ["/admin", "/cliente"], message: "Recompensa resgatada." });
}
