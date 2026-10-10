import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
  listDayAppointments,
  rescheduleAppointment,
} from "@/server/services/appointment.service";
import { getAvailability } from "@/server/services/availability.service";
import { shopDateTimeToUtc } from "@/lib/time";
import { MONDAY, NOW, SUNDAY, TUESDAY, seedScenario, type Scenario } from "./helpers/factory";

let s: Scenario;
beforeEach(async () => {
  s = await seedScenario();
});

const book = (sc: Scenario, actor: Scenario["ana"], overrides: Record<string, unknown> = {}) =>
  createAppointment(actor, { serviceId: sc.corte.id, barberId: sc.joao.barberId, date: TUESDAY, time: "14:30", ...overrides }, NOW);

describe("3. Criação de agendamento", () => {
  it("cliente cria agendamento pendente com preço congelado do serviço", async () => {
    const appt = await book(s, s.ana);
    expect(appt.status).toBe("PENDING");
    expect(appt.client.id).toBe(s.ana.id);
    expect(appt.barber.id).toBe(s.joao.barberId);
    expect(appt.date).toBe(TUESDAY);
    expect(appt.startTime).toBe("14:30");
    expect(appt.endTime).toBe("15:00");
    expect(appt.priceCents).toBe(4000);
    expect(appt.startsAt).toBe(shopDateTimeToUtc(TUESDAY, "14:30").toISOString());
  });

  it("cliente não consegue agendar em nome de outro cliente", async () => {
    const appt = await book(s, s.ana, { clientId: s.bruno.id });
    expect(appt.client.id).toBe(s.ana.id);
  });

  it("'qualquer barbeiro' escolhe um barbeiro livre", async () => {
    await book(s, s.ana); // João ocupado às 14:30
    const appt = await book(s, s.bruno, { barberId: "any" });
    expect(appt.barber.id).toBe(s.pedro.barberId);
  });

  it("serviço desativado não pode ser agendado", async () => {
    await expect(book(s, s.ana, { serviceId: s.inactive.id })).rejects.toMatchObject({ code: "SERVICE_INACTIVE" });
  });

  it("barbeiro desativado não pode ser agendado", async () => {
    await db.barber.update({ where: { id: s.joao.barberId! }, data: { active: false } });
    await expect(book(s, s.ana)).rejects.toMatchObject({ code: "BARBER_UNAVAILABLE" });
  });

  it("barbeiro agenda um cliente sempre na PRÓPRIA agenda, já confirmado", async () => {
    // Mesmo tentando indicar outro barbeiro, o agendamento vai para a agenda de quem está logado.
    const appt = await createAppointment(
      s.joao,
      { clientId: s.ana.id, serviceId: s.corte.id, barberId: s.pedro.barberId, date: TUESDAY, time: "10:00" },
      NOW,
    );
    expect(appt.barber.id).toBe(s.joao.barberId);
    expect(appt.client.id).toBe(s.ana.id);
    expect(appt.status).toBe("CONFIRMED");
  });

  it("barbeiro respeita conflitos e horário de funcionamento da própria agenda", async () => {
    await book(s, s.ana); // João às 14:30
    await expect(
      createAppointment(s.joao, { clientId: s.bruno.id, serviceId: s.corte.id, barberId: s.joao.barberId, date: TUESDAY, time: "14:30" }, NOW),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    await expect(
      createAppointment(s.joao, { clientId: s.bruno.id, serviceId: s.corte.id, barberId: s.joao.barberId, date: TUESDAY, time: "12:00" }, NOW),
    ).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
  });

  it("barbeiro exige um cliente válido e só consulta horários da própria agenda", async () => {
    await expect(
      createAppointment(s.joao, { serviceId: s.corte.id, barberId: s.joao.barberId, date: TUESDAY, time: "10:00" }, NOW),
    ).rejects.toThrow();
    await expect(
      createAppointment(s.joao, { clientId: s.admin.id, serviceId: s.corte.id, barberId: s.joao.barberId, date: TUESDAY, time: "10:00" }, NOW),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await book(s, s.ana, { barberId: s.pedro.barberId }); // Pedro ocupado 14:30
    const { slots } = await getAvailability(s.joao, { serviceId: s.corte.id, barberId: s.pedro.barberId, date: TUESDAY }, NOW);
    // Consulta forçada para a agenda do João (livre às 14:30), não a do Pedro.
    expect(slots.find((x) => x.time === "14:30")?.available).toBe(true);
  });
});

describe("4. Horário ocupado", () => {
  it("cliente não consegue agendar horário já ocupado", async () => {
    await book(s, s.ana);
    await expect(book(s, s.bruno)).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("bloqueia sobreposição parcial (serviço de 60 min cobrindo um horário ocupado)", async () => {
    await book(s, s.ana, { time: "15:00" });
    await expect(book(s, s.bruno, { serviceId: s.combo.id, time: "14:30" })).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("horário ocupado aparece como indisponível na listagem", async () => {
    await book(s, s.ana);
    const { slots } = await getAvailability(s.bruno, { serviceId: s.corte.id, barberId: s.joao.barberId, date: TUESDAY }, NOW);
    expect(slots.find((x) => x.time === "14:30")?.available).toBe(false);
    expect(slots.find((x) => x.time === "15:00")?.available).toBe(true);
    expect(slots.some((x) => x.time === "12:00")).toBe(false); // intervalo de almoço
  });

  it("a constraint do banco impede sobreposição mesmo ignorando a camada de serviço", async () => {
    const base = {
      clientId: s.ana.id,
      barberId: s.joao.barberId!,
      serviceId: s.corte.id,
      date: new Date(`${TUESDAY}T00:00:00Z`),
      priceCents: 4000,
    };
    await db.appointment.create({
      data: { ...base, startTime: shopDateTimeToUtc(TUESDAY, "10:00"), endTime: shopDateTimeToUtc(TUESDAY, "10:30") },
    });
    await expect(
      db.appointment.create({
        data: { ...base, startTime: shopDateTimeToUtc(TUESDAY, "10:15"), endTime: shopDateTimeToUtc(TUESDAY, "10:45") },
      }),
    ).rejects.toThrow(/appointment_no_overlap|23P01|exclusion/i);
  });
});

describe("5. Concorrência", () => {
  it("dois clientes reservando simultaneamente o mesmo horário: apenas um consegue", async () => {
    const results = await Promise.allSettled([book(s, s.ana), book(s, s.bruno)]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toMatchObject({ code: "SLOT_UNAVAILABLE" });
    expect(await db.appointment.count({ where: { barberId: s.joao.barberId!, status: "PENDING" } })).toBe(1);
  });

  it("dez reservas concorrentes no mesmo horário resultam em um único agendamento", async () => {
    const clients = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        db.user.create({ data: { name: `C${i}`, email: `c${i}@t.com`, passwordHash: "x", role: "CLIENT" } }),
      ),
    );
    const actors = [s.ana, s.bruno, ...clients.map((c) => ({ ...c, role: "CLIENT" as const, barberId: null }))];
    const results = await Promise.allSettled(actors.map((a) => book(s, a)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});

describe("7/8. Visibilidade da agenda", () => {
  it("barbeiro não consegue visualizar a agenda de outro barbeiro", async () => {
    await book(s, s.ana);
    await expect(listDayAppointments(s.pedro, TUESDAY, s.joao.barberId!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Sem filtro explícito, o barbeiro recebe somente a própria agenda.
    expect(await listDayAppointments(s.pedro, TUESDAY)).toHaveLength(0);
    expect(await listDayAppointments(s.joao, TUESDAY)).toHaveLength(1);
  });

  it("barbeiro não acessa nem altera agendamento de outro barbeiro", async () => {
    const appt = await book(s, s.ana);
    await expect(getAppointment(s.pedro, appt.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(confirmAppointment(s.pedro, appt.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const list = await listAppointments(s.pedro, { barberId: s.joao.barberId! });
    expect(list.total).toBe(0);
  });

  it("cliente não acessa agendamento de outro cliente", async () => {
    const appt = await book(s, s.ana);
    await expect(getAppointment(s.bruno, appt.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(cancelAppointment(s.bruno, { appointmentId: appt.id }, NOW)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("admin visualiza todos os agendamentos", async () => {
    await book(s, s.ana);
    await book(s, s.bruno, { barberId: s.pedro.barberId });
    const all = await listAppointments(s.admin, {});
    expect(all.total).toBe(2);
    expect(await listDayAppointments(s.admin, TUESDAY)).toHaveLength(2);
    expect((await listAppointments(s.admin, { barberId: s.pedro.barberId! })).total).toBe(1);
  });
});

describe("9. Cancelamento", () => {
  it("cancelamento libera o horário para outro cliente", async () => {
    const appt = await book(s, s.ana);
    await cancelAppointment(s.ana, { appointmentId: appt.id, reason: "Imprevisto" }, NOW);
    const again = await book(s, s.bruno);
    expect(again.status).toBe("PENDING");
    const cancelled = await getAppointment(s.ana, appt.id);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("cliente não cancela com menos antecedência que a política", async () => {
    const appt = await book(s, s.ana);
    const late = new Date(shopDateTimeToUtc(TUESDAY, "14:30").getTime() - 30 * 60_000);
    await expect(cancelAppointment(s.ana, { appointmentId: appt.id }, late)).rejects.toMatchObject({
      code: "CANCELLATION_TOO_LATE",
    });
  });

  it("não é possível cancelar duas vezes", async () => {
    const appt = await book(s, s.ana);
    await cancelAppointment(s.ana, { appointmentId: appt.id }, NOW);
    await expect(cancelAppointment(s.ana, { appointmentId: appt.id }, NOW)).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
    });
  });
});

describe("10. Horário passado", () => {
  it("não permite agendar em data passada", async () => {
    await expect(book(s, s.ana, { date: "2030-01-06", time: "10:00" })).rejects.toMatchObject({ code: "SLOT_IN_PAST" });
  });

  it("não permite agendar hoje em horário já passado nem sem a antecedência mínima", async () => {
    // NOW = segunda 08:00 local; antecedência mínima 60 min => primeiro horário 09:00
    const later = new Date(shopDateTimeToUtc(MONDAY, "10:10"));
    await expect(createAppointment(s.ana, { serviceId: s.corte.id, barberId: s.joao.barberId, date: MONDAY, time: "10:00" }, later)).rejects.toMatchObject({ code: "SLOT_IN_PAST" });
    await expect(createAppointment(s.ana, { serviceId: s.corte.id, barberId: s.joao.barberId, date: MONDAY, time: "11:00" }, later)).rejects.toMatchObject({ code: "SLOT_IN_PAST" });
    const ok = await createAppointment(s.ana, { serviceId: s.corte.id, barberId: s.joao.barberId, date: MONDAY, time: "11:30" }, later);
    expect(ok.startTime).toBe("11:30");
  });

  it("horários passados aparecem como indisponíveis", async () => {
    const later = shopDateTimeToUtc(MONDAY, "15:00");
    const { slots } = await getAvailability(s.ana, { serviceId: s.corte.id, barberId: "any", date: MONDAY }, later);
    expect(slots.filter((x) => x.available).every((x) => x.time >= "16:00")).toBe(true);
  });
});

describe("11. Horário de funcionamento", () => {
  it("não permite agendar antes da abertura, depois do fechamento ou no intervalo", async () => {
    await expect(book(s, s.ana, { time: "08:30" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
    await expect(book(s, s.ana, { time: "19:00" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
    await expect(book(s, s.ana, { time: "12:00" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
    // Serviço de 60 min às 11:30 invadiria o intervalo das 12:00
    await expect(book(s, s.ana, { serviceId: s.combo.id, time: "11:30" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
    // Serviço de 60 min às 18:30 terminaria após o fechamento
    await expect(book(s, s.ana, { serviceId: s.combo.id, time: "18:30" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
  });

  it("não permite agendar em dia fechado", async () => {
    await expect(book(s, s.ana, { date: SUNDAY, time: "10:00" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
    const result = await getAvailability(s.ana, { serviceId: s.corte.id, barberId: "any", date: SUNDAY }, NOW);
    expect(result.closed).toBe(true);
    expect(result.slots).toHaveLength(0);
  });

  it("respeita a jornada específica do barbeiro (limitada pelo horário geral)", async () => {
    await db.businessHours.create({
      data: { barberId: s.joao.barberId, dayOfWeek: 2, startTime: "14:00", endTime: "22:00", active: true },
    });
    await expect(book(s, s.ana, { time: "10:00" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
    await expect(book(s, s.ana, { time: "19:00" })).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
    expect((await book(s, s.ana, { time: "18:30" })).startTime).toBe("18:30");
  });

  it("não permite agendar além da janela máxima", async () => {
    await expect(book(s, s.ana, { date: "2030-06-04" })).rejects.toMatchObject({ code: "TOO_FAR_AHEAD" });
  });
});

describe("Fluxo do barbeiro e reagendamento", () => {
  it("barbeiro confirma e conclui o próprio atendimento", async () => {
    const appt = await book(s, s.ana);
    await confirmAppointment(s.joao, appt.id);
    await expect(completeAppointment(s.joao, appt.id, NOW)).rejects.toMatchObject({ code: "CANNOT_COMPLETE_FUTURE" });
    await completeAppointment(s.joao, appt.id, shopDateTimeToUtc(TUESDAY, "14:40"));
    expect((await getAppointment(s.admin, appt.id)).status).toBe("COMPLETED");
  });

  it("reagendamento valida conflito e libera o horário antigo", async () => {
    const a = await book(s, s.ana);
    await book(s, s.bruno, { time: "16:00" });
    await expect(
      rescheduleAppointment(s.ana, { appointmentId: a.id, date: TUESDAY, time: "16:00" }, NOW),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    // Reagendar para um horário que sobrepõe o próprio horário atual é permitido
    const moved = await rescheduleAppointment(s.ana, { appointmentId: a.id, date: TUESDAY, time: "14:45" }, NOW);
    expect(moved.startTime).toBe("14:45");
    const freed = await book(s, s.bruno, { time: "14:00" });
    expect(freed.startTime).toBe("14:00");
  });

  it("apenas admin pode transferir o agendamento para outro barbeiro", async () => {
    const a = await book(s, s.ana);
    await expect(
      rescheduleAppointment(s.ana, { appointmentId: a.id, date: TUESDAY, time: "14:30", barberId: s.pedro.barberId }, NOW),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const moved = await rescheduleAppointment(
      s.admin,
      { appointmentId: a.id, date: TUESDAY, time: "14:30", barberId: s.pedro.barberId },
      NOW,
    );
    expect(moved.barber.id).toBe(s.pedro.barberId);
  });

  it("admin cria agendamento em nome de um cliente (já confirmado)", async () => {
    const appt = await createAppointment(
      s.admin,
      { clientId: s.bruno.id, serviceId: s.combo.id, barberId: s.pedro.barberId, date: TUESDAY, time: "09:00" },
      NOW,
    );
    expect(appt.client.id).toBe(s.bruno.id);
    expect(appt.status).toBe("CONFIRMED");
  });
});
