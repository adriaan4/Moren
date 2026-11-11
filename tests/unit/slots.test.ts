import { describe, expect, it } from "vitest";
import { cellsFor, computeSlots, type SlotContext } from "../../src/services/slots";
import { addDays, diffDays, fromMinutes, toMinutes } from "../../src/lib/time";

const base: SlotContext = {
  date: "2030-03-06",
  today: "2030-03-01",
  nowMin: 600,
  ranges: [{ start: "09:00", end: "14:00" }, { start: "16:00", end: "20:00" }],
  blocks: [],
  occupied: new Set(),
  minAdvanceHours: 0,
  maxDaysAhead: 60,
  slotStepMin: 15,
  enforceWindow: true,
};
const hhmm = (s: number[]) => s.map(fromMinutes);

describe("time utils", () => {
  it("convierte horas y suma días", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(fromMinutes(570)).toBe("09:30");
    expect(addDays("2030-02-28", 1)).toBe("2030-03-01");
    expect(diffDays("2030-03-01", "2030-03-06")).toBe(5);
  });
});

describe("computeSlots", () => {
  it("respeta el horario y el descanso de mediodía", () => {
    const slots = hhmm(computeSlots({ ...base, slotStepMin: 30 }, 30));
    expect(slots[0]).toBe("09:00");
    expect(slots).toContain("13:30");
    expect(slots).not.toContain("14:00");
    expect(slots).not.toContain("15:30");
    expect(slots).toContain("16:00");
    expect(slots[slots.length - 1]).toBe("19:30");
  });

  it("no ofrece horas en las que el servicio no cabe antes del cierre/descanso", () => {
    const slots = hhmm(computeSlots({ ...base, slotStepMin: 15 }, 45));
    expect(slots).toContain("13:15");
    expect(slots).not.toContain("13:30");
  });

  it("excluye horas ocupadas, incluso si solo se solapa parte del servicio", () => {
    const occupied = new Set(cellsFor(10 * 60, 30)); // 10:00-10:30
    const slots = hhmm(computeSlots({ ...base, occupied }, 30));
    expect(slots).not.toContain("09:45");
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:15");
    expect(slots).toContain("09:30");
    expect(slots).toContain("10:30");
  });

  it("aplica los bloqueos de horas y de día completo", () => {
    const partial = hhmm(computeSlots({ ...base, blocks: [{ id: "b", date: base.date, start: "11:00", end: "12:00" }] }, 30));
    expect(partial).not.toContain("11:15");
    expect(partial).toContain("12:00");
    const full = computeSlots({ ...base, blocks: [{ id: "b", date: base.date, start: "00:00", end: "24:00" }] }, 30);
    expect(full).toEqual([]);
  });

  it("devuelve vacío si el día está cerrado o es pasado", () => {
    expect(computeSlots({ ...base, ranges: [] }, 30)).toEqual([]);
    expect(computeSlots({ ...base, date: "2030-02-20" }, 30)).toEqual([]);
  });

  it("respeta la antelación mínima (solo clientes)", () => {
    const today = { ...base, date: base.today, nowMin: 10 * 60, minAdvanceHours: 2 };
    expect(hhmm(computeSlots(today, 30))[0]).toBe("12:00");
    expect(hhmm(computeSlots({ ...today, enforceWindow: false }, 30))[0]).toBe("10:00");
  });

  it("respeta el límite de días futuros (solo clientes)", () => {
    const far = { ...base, date: addDays(base.today, 61) };
    expect(computeSlots(far, 30)).toEqual([]);
    expect(computeSlots({ ...far, enforceWindow: false }, 30).length).toBeGreaterThan(0);
  });
});
