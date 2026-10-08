import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { computeLoyalty, getLoyaltyStatus, redeemReward } from "@/server/services/loyalty.service";
import {
  activateSubscription,
  cancelSubscription,
  getMySubscription,
  requestSubscription,
} from "@/server/services/plan.service";
import { shopDateTimeToUtc } from "@/lib/time";
import { seedScenario, TUESDAY, type Scenario } from "./helpers/factory";

let s: Scenario;
beforeEach(async () => {
  s = await seedScenario();
});

async function completedVisits(sc: Scenario, clientId: string, n: number) {
  for (let i = 0; i < n; i++) {
    const start = shopDateTimeToUtc(TUESDAY, `${String(9 + i).padStart(2, "0")}:00`);
    await db.appointment.create({
      data: {
        clientId,
        barberId: sc.joao.barberId!,
        serviceId: sc.corte.id,
        date: new Date(`${TUESDAY}T00:00:00Z`),
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
        priceCents: 4000,
        status: "COMPLETED",
      },
    });
  }
}

describe("Clube do Mandu", () => {
  it("calcula selos e recompensas", () => {
    expect(computeLoyalty(0, 0, 10)).toEqual({ earned: 0, stamps: 0, available: 0 });
    expect(computeLoyalty(13, 0, 10)).toEqual({ earned: 1, stamps: 3, available: 1 });
    expect(computeLoyalty(23, 1, 10)).toEqual({ earned: 2, stamps: 3, available: 1 });
  });

  it("selos vêm apenas de atendimentos concluídos e o resgate respeita o saldo", async () => {
    await db.shopSettings.update({ where: { id: 1 }, data: { loyaltyGoal: 3 } });
    await completedVisits(s, s.ana.id, 3);
    const status = await getLoyaltyStatus(s.ana);
    expect(status).toMatchObject({ completed: 3, earned: 1, available: 1, stamps: 0 });

    await redeemReward(s.admin, s.ana.id);
    await expect(redeemReward(s.admin, s.ana.id)).rejects.toMatchObject({ code: "NO_REWARD_AVAILABLE" });
    expect((await getLoyaltyStatus(s.ana)).available).toBe(0);
  });

  it("resgates concorrentes não ultrapassam o saldo", async () => {
    await db.shopSettings.update({ where: { id: 1 }, data: { loyaltyGoal: 3 } });
    await completedVisits(s, s.ana.id, 3);
    const results = await Promise.allSettled([redeemReward(s.admin, s.ana.id), redeemReward(s.admin, s.ana.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("somente admin registra resgates e cliente só vê o próprio status", async () => {
    await expect(redeemReward(s.ana, s.ana.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getLoyaltyStatus(s.joao)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await completedVisits(s, s.bruno.id, 2);
    expect((await getLoyaltyStatus(s.ana, s.bruno.id)).completed).toBe(0); // ignora clientId de cliente
  });
});

describe("Planos", () => {
  it("cliente solicita, admin ativa, cliente cancela", async () => {
    const plan = await db.plan.create({ data: { name: "Plano Corte", priceCents: 12900 } });
    const sub = await requestSubscription(s.ana, plan.id);
    expect(sub.status).toBe("PENDING");
    expect(sub.priceCents).toBe(12900);
    await activateSubscription(s.admin, sub.id);
    expect((await getMySubscription(s.ana))?.status).toBe("ACTIVE");
    await cancelSubscription(s.ana, sub.id);
    expect(await getMySubscription(s.ana)).toBeNull();
  });

  it("não permite duas assinaturas em andamento, nem planos inativos", async () => {
    const plan = await db.plan.create({ data: { name: "A", priceCents: 100 } });
    const inactive = await db.plan.create({ data: { name: "B", priceCents: 100, active: false } });
    await expect(requestSubscription(s.ana, inactive.id)).rejects.toMatchObject({ code: "PLAN_INACTIVE" });
    await requestSubscription(s.ana, plan.id);
    await expect(requestSubscription(s.ana, plan.id)).rejects.toMatchObject({ code: "SUBSCRIPTION_EXISTS" });
  });

  it("cliente não cancela a assinatura de outro cliente nem ativa a própria", async () => {
    const plan = await db.plan.create({ data: { name: "A", priceCents: 100 } });
    const sub = await requestSubscription(s.ana, plan.id);
    await expect(cancelSubscription(s.bruno, sub.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(activateSubscription(s.ana, sub.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
