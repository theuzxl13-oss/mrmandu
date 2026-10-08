/**
 * Planos mensais e assinaturas.
 * Não há cobrança online: o cliente solicita o plano (PENDENTE) e a barbearia
 * ativa após o pagamento. Um índice parcial no banco garante no máximo uma
 * assinatura pendente/ativa por cliente.
 */
import { Prisma, type SubscriptionStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import type { SessionUser } from "@/types/auth";
import { idSchema } from "@/validations/common";
import { planSchema, toggleActiveSchema } from "@/validations/catalog";

export interface PlanDTO {
  id: string;
  name: string;
  description: string | null;
  benefits: string[];
  priceCents: number;
  active: boolean;
}

const planSelect = { id: true, name: true, description: true, benefits: true, priceCents: true, active: true } as const;

function toPlanDTO(p: Prisma.PlanGetPayload<{ select: typeof planSelect }>): PlanDTO {
  return { ...p, benefits: p.benefits ? p.benefits.split("\n") : [] };
}

export async function listActivePlans(): Promise<PlanDTO[]> {
  const rows = await db.plan.findMany({ where: { active: true }, select: planSelect, orderBy: { priceCents: "asc" } });
  return rows.map(toPlanDTO);
}

export async function listAllPlans(actor: SessionUser) {
  assertRole(actor, "ADMIN");
  const rows = await db.plan.findMany({
    select: { ...planSelect, _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ active: "desc" }, { priceCents: "asc" }],
  });
  return rows.map(({ _count, ...p }) => ({ ...toPlanDTO(p), activeSubscribers: _count.subscriptions }));
}

function toPlanData(input: unknown) {
  const d = planSchema.parse(input);
  return { name: d.name, description: d.description, benefits: d.benefits, priceCents: Math.round(d.price * 100), active: d.active };
}

export async function createPlan(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  return db.plan.create({ data: toPlanData(input), select: { id: true } });
}

export async function updatePlan(actor: SessionUser, id: unknown, input: unknown) {
  assertRole(actor, "ADMIN");
  const planId = idSchema.parse(id);
  const exists = await db.plan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!exists) throw new AppError("NOT_FOUND");
  await db.plan.update({ where: { id: planId }, data: toPlanData(input) });
}

export async function setPlanActive(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  const { id, active } = toggleActiveSchema.parse(input);
  await db.plan.update({ where: { id }, data: { active } });
}

export interface SubscriptionDTO {
  id: string;
  status: SubscriptionStatus;
  priceCents: number;
  createdAt: string;
  activatedAt: string | null;
  plan: PlanDTO;
  client: { id: string; name: string; email: string; phone: string | null };
}

const subscriptionInclude = {
  plan: { select: planSelect },
  client: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.SubscriptionInclude;

function toSubscriptionDTO(s: Prisma.SubscriptionGetPayload<{ include: typeof subscriptionInclude }>): SubscriptionDTO {
  return {
    id: s.id,
    status: s.status,
    priceCents: s.priceCents,
    createdAt: s.createdAt.toISOString(),
    activatedAt: s.activatedAt?.toISOString() ?? null,
    plan: toPlanDTO(s.plan),
    client: s.client,
  };
}

/** Assinatura em andamento (pendente ou ativa) do cliente logado. */
export async function getMySubscription(actor: SessionUser): Promise<SubscriptionDTO | null> {
  assertRole(actor, "CLIENT");
  const sub = await db.subscription.findFirst({
    where: { clientId: actor.id, status: { in: ["PENDING", "ACTIVE"] } },
    include: subscriptionInclude,
  });
  return sub ? toSubscriptionDTO(sub) : null;
}

export async function requestSubscription(actor: SessionUser, planId: unknown): Promise<SubscriptionDTO> {
  assertRole(actor, "CLIENT");
  const plan = await db.plan.findUnique({ where: { id: idSchema.parse(planId) } });
  if (!plan || !plan.active) throw new AppError("PLAN_INACTIVE");
  try {
    const sub = await db.subscription.create({
      data: { clientId: actor.id, planId: plan.id, priceCents: plan.priceCents },
      include: subscriptionInclude,
    });
    return toSubscriptionDTO(sub);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("SUBSCRIPTION_EXISTS");
    throw error;
  }
}

/** Cliente cancela a própria assinatura; admin cancela qualquer uma. */
export async function cancelSubscription(actor: SessionUser, id: unknown) {
  assertRole(actor, "CLIENT", "ADMIN");
  const subId = idSchema.parse(id);
  const { count } = await db.subscription.updateMany({
    where: {
      id: subId,
      status: { in: ["PENDING", "ACTIVE"] },
      ...(actor.role === "CLIENT" ? { clientId: actor.id } : {}),
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (count === 0) throw new AppError("NOT_FOUND");
}

export async function activateSubscription(actor: SessionUser, id: unknown) {
  assertRole(actor, "ADMIN");
  const { count } = await db.subscription.updateMany({
    where: { id: idSchema.parse(id), status: "PENDING" },
    data: { status: "ACTIVE", activatedAt: new Date() },
  });
  if (count === 0) throw new AppError("INVALID_STATUS_TRANSITION");
}

export async function listSubscriptions(actor: SessionUser): Promise<SubscriptionDTO[]> {
  assertRole(actor, "ADMIN");
  const rows = await db.subscription.findMany({
    where: { status: { in: ["PENDING", "ACTIVE"] } },
    include: subscriptionInclude,
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toSubscriptionDTO);
}
