import { getSettings } from "@/repositories/settingsRepo";
import * as scheduleRepo from "@/repositories/scheduleRepo";
import { getOccupiedCells } from "@/repositories/bookingRepo";
import { dayOfWeek, diffDays, eachDate, fromMinutes, monthDates, nowInMadrid, toMinutes } from "@/lib/time";
import { CELL, computeSlots, type SlotContext } from "./slots";
import type { Block, Closure, DayOverview, Range, ScheduleException, Settings, WeeklySchedule } from "@/types";

export { CELL, cellsFor, computeSlots, type SlotContext } from "./slots";

// ── Carga de datos ────────────────────────────────────────────────────────

interface Shared {
  settings: Settings;
  weekly: WeeklySchedule;
  exceptions: Map<string, ScheduleException>;
  closures: Closure[];
  blocks: Block[];
}

export async function loadShared(): Promise<Shared> {
  const [settings, weekly, exceptions, closures, blocks] = await Promise.all([
    getSettings(),
    scheduleRepo.getWeekly(),
    scheduleRepo.listExceptions(),
    scheduleRepo.listClosures(),
    scheduleRepo.listBlocks(),
  ]);
  return { settings, weekly, exceptions: new Map(exceptions.map((e) => [e.date, e])), closures, blocks };
}

export interface DaySchedule {
  open: boolean;
  ranges: Range[];
  /** Motivo visible del cierre */
  closedLabel?: string;
  closedBy?: "closure" | "exception" | "weekly";
}

/** Horario efectivo de una fecha (sin reservas): vacaciones > excepción > semana. */
export function resolveDay(shared: Shared, date: string): DaySchedule {
  const closure = shared.closures.find((c) => c.start <= date && date <= c.end);
  if (closure) return { open: false, ranges: [], closedLabel: closure.message || closure.reason, closedBy: "closure" };
  const ex = shared.exceptions.get(date);
  if (ex) {
    if (ex.closed || !ex.ranges.length) return { open: false, ranges: [], closedLabel: ex.note || "Cerrado", closedBy: "exception" };
    return { open: true, ranges: ex.ranges };
  }
  const w = shared.weekly[String(dayOfWeek(date))];
  if (!w || !w.open || !w.ranges.length) return { open: false, ranges: [], closedBy: "weekly" };
  return { open: true, ranges: w.ranges };
}

async function buildContext(shared: Shared, date: string, enforceWindow: boolean, excludeBookingId?: string): Promise<SlotContext> {
  const now = nowInMadrid();
  const day = resolveDay(shared, date);
  let occupied = new Set<number>();
  if (day.open) {
    const lo = Math.min(...day.ranges.map((r) => toMinutes(r.start)));
    const hi = Math.max(...day.ranges.map((r) => toMinutes(r.end)));
    const cells: number[] = [];
    for (let c = lo - (lo % CELL); c < hi; c += CELL) cells.push(c);
    const map = await getOccupiedCells(date, cells);
    occupied = new Set([...map.entries()].filter(([, id]) => id !== excludeBookingId).map(([c]) => c));
  }
  return {
    date,
    today: now.date,
    nowMin: now.minutes,
    ranges: day.ranges,
    blocks: shared.blocks.filter((b) => b.date === date),
    occupied,
    minAdvanceHours: shared.settings.minAdvanceHours,
    maxDaysAhead: shared.settings.maxDaysAhead,
    slotStepMin: shared.settings.slotStepMin,
    enforceWindow,
  };
}

export interface SlotOptions {
  enforceWindow?: boolean;
  excludeBookingId?: string;
}

/** Horas disponibles ("HH:MM") para una fecha y duración. Se calcula siempre en el servidor. */
export async function getAvailableSlots(date: string, durationMin: number, opts: SlotOptions = {}): Promise<string[]> {
  const shared = await loadShared();
  const ctx = await buildContext(shared, date, opts.enforceWindow ?? true, opts.excludeBookingId);
  return computeSlots(ctx, durationMin).map(fromMinutes);
}

/** Estado de cada día de un mes para el calendario público (sin datos personales). */
export async function getMonthOverview(
  month: string,
  durationMin: number,
  opts: SlotOptions = {},
): Promise<DayOverview[]> {
  const shared = await loadShared();
  const enforce = opts.enforceWindow ?? true;
  const now = nowInMadrid();
  return Promise.all(
    monthDates(month).map(async (date): Promise<DayOverview> => {
      if (date < now.date) return { date, status: "past" };
      if (enforce && diffDays(now.date, date) > shared.settings.maxDaysAhead) return { date, status: "out_of_range" };
      const day = resolveDay(shared, date);
      if (!day.open) return { date, status: "closed", label: day.closedBy === "weekly" ? undefined : day.closedLabel };
      const ctx = await buildContext(shared, date, enforce, opts.excludeBookingId);
      return { date, status: computeSlots(ctx, durationMin).length ? "available" : "full" };
    }),
  );
}

/** Horario efectivo por día para el calendario del administrador. */
export async function getScheduleRange(from: string, to: string) {
  const shared = await loadShared();
  return eachDate(from, to).map((date) => {
    const d = resolveDay(shared, date);
    return { date, open: d.open, ranges: d.ranges, closedLabel: d.closedLabel, closedBy: d.closedBy, blocks: shared.blocks.filter((b) => b.date === date) };
  });
}
