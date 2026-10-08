import { describe, expect, it } from "vitest";
import { buildSlotGrid, mergeSlotGrids, workingIntervals } from "@/server/scheduling/slots";

const shop = { startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", active: true };

describe("Regras puras de disponibilidade", () => {
  it("remove o intervalo de almoço do expediente", () => {
    expect(workingIntervals(shop, null)).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 1140 },
    ]);
  });

  it("dia fechado ou folga do barbeiro não tem expediente", () => {
    expect(workingIntervals({ ...shop, active: false }, null)).toEqual([]);
    expect(workingIntervals(shop, { ...shop, active: false })).toEqual([]);
  });

  it("jornada do barbeiro é limitada ao horário da barbearia", () => {
    const barber = { startTime: "08:00", endTime: "15:00", breakStart: null, breakEnd: null, active: true };
    expect(workingIntervals(shop, barber)).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 900 },
    ]);
  });

  it("gera grade sem ultrapassar o fim do expediente e marca ocupados", () => {
    const slots = buildSlotGrid({
      intervals: [{ start: 540, end: 660 }],
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      busy: [{ start: 570, end: 600 }],
      earliestStart: Number.NEGATIVE_INFINITY,
    });
    expect(slots).toEqual([
      { time: "09:00", available: false },
      { time: "09:30", available: false },
      { time: "10:00", available: true },
    ]);
  });

  it("combina grades: disponível se algum barbeiro estiver livre", () => {
    const merged = mergeSlotGrids([
      [{ time: "09:00", available: false }],
      [{ time: "09:00", available: true }, { time: "09:30", available: false }],
    ]);
    expect(merged).toEqual([
      { time: "09:00", available: true },
      { time: "09:30", available: false },
    ]);
  });
});
