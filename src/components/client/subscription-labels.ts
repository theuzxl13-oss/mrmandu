import type { SubscriptionStatus } from "@prisma/client";

export const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  PENDING: "Aguardando ativação",
  ACTIVE: "Ativo",
  CANCELLED: "Cancelado",
};
