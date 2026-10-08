/**
 * Clube do Mandu — programa de fidelidade.
 * Cada atendimento CONCLUÍDO vale 1 selo; a cada `loyaltyGoal` selos o cliente
 * ganha uma recompensa. Os selos são derivados dos próprios agendamentos
 * (fonte única de verdade); apenas os resgates são registrados.
 */
import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import type { SessionUser } from "@/types/auth";
import { idSchema } from "@/validations/common";
import { getShopSettings } from "./settings.service";

export interface LoyaltyStatus {
  goal: number;
  reward: string;
  completed: number;
  /** Selos no cartão atual (0..goal-1). */
  stamps: number;
  earned: number;
  redeemed: number;
  available: number;
  redemptions: { id: string; reward: string; createdAt: string }[];
}

export function computeLoyalty(completed: number, redeemed: number, goal: number) {
  const earned = Math.floor(completed / goal);
  return { earned, stamps: completed - earned * goal, available: Math.max(0, earned - redeemed) };
}

async function loadStatus(clientId: string): Promise<LoyaltyStatus> {
  const [settings, completed, redemptions] = await Promise.all([
    getShopSettings(),
    db.appointment.count({ where: { clientId, status: "COMPLETED" } }),
    db.loyaltyRedemption.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } }),
  ]);
  const calc = computeLoyalty(completed, redemptions.length, settings.loyaltyGoal);
  return {
    goal: settings.loyaltyGoal,
    reward: settings.loyaltyReward,
    completed,
    redeemed: redemptions.length,
    ...calc,
    redemptions: redemptions.map((r) => ({ id: r.id, reward: r.reward, createdAt: r.createdAt.toISOString() })),
  };
}

/** Cliente: sempre o próprio status. Admin: de qualquer cliente. */
export async function getLoyaltyStatus(actor: SessionUser, clientId?: string): Promise<LoyaltyStatus> {
  assertRole(actor, "CLIENT", "ADMIN");
  if (actor.role === "CLIENT") return loadStatus(actor.id);
  return loadStatus(idSchema.parse(clientId));
}

/** Registra o resgate de uma recompensa (feito pela barbearia). Serializado por cliente. */
export async function redeemReward(actor: SessionUser, clientId: unknown) {
  assertRole(actor, "ADMIN");
  const id = idSchema.parse(clientId);
  const settings = await getShopSettings();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`loyalty:${id}`}))`;
    const client = await tx.user.findFirst({ where: { id, role: "CLIENT" }, select: { id: true } });
    if (!client) throw new AppError("NOT_FOUND");
    const [completed, redeemed] = await Promise.all([
      tx.appointment.count({ where: { clientId: id, status: "COMPLETED" } }),
      tx.loyaltyRedemption.count({ where: { clientId: id } }),
    ]);
    if (computeLoyalty(completed, redeemed, settings.loyaltyGoal).available < 1) throw new AppError("NO_REWARD_AVAILABLE");
    await tx.loyaltyRedemption.create({ data: { clientId: id, reward: settings.loyaltyReward } });
  });
}
