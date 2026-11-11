import { addDays, dayOfWeek, nowInMadrid } from "../../src/lib/time";
import { saveWeekly } from "../../src/repositories/scheduleRepo";
import { saveSettings, DEFAULT_SETTINGS } from "../../src/repositories/settingsRepo";
import { createService } from "../../src/repositories/serviceRepo";
import type { Settings, WeeklySchedule } from "../../src/types";

/** Próximo día de la semana `dow` (0=domingo) al menos `minDaysAhead` días en el futuro. */
export function nextWeekday(dow: number, minDaysAhead = 3): string {
  let d = addDays(nowInMadrid().date, minDaysAhead);
  while (dayOfWeek(d) !== dow) d = addDays(d, 1);
  return d;
}

export const WEEK_OPEN: WeeklySchedule = Object.fromEntries(
  [0, 1, 2, 3, 4, 5, 6].map((d) => [
    String(d),
    d === 0
      ? { open: false, ranges: [] }
      : { open: true, ranges: [{ start: "09:00", end: "14:00" }, { start: "16:00", end: "20:00" }] },
  ]),
);

export async function seed(overrides: Partial<Settings> = {}) {
  await saveSettings({ ...DEFAULT_SETTINGS, minAdvanceHours: 0, maxDaysAhead: 90, cancelMinHours: 24, modifyMinHours: 24, ...overrides });
  await saveWeekly(WEEK_OPEN);
  const corte = await createService({ name: "Corte de prueba", priceCents: 1500, durationMin: 30, active: true });
  const barba = await createService({ name: "Barba de prueba", priceCents: 1000, durationMin: 15, active: true });
  return { corte, barba };
}

export const customer = (n = 1) => ({ firstName: `Ana${n}`, lastName: "Pérez", phone: `600 00 00 0${n}`, email: `cliente${n}@example.com` });
