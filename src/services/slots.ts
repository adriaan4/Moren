/**
 * Cálculo puro de huecos (sin Redis ni red) para poder probarlo de forma unitaria.
 * La disponibilidad real se construye en availability.ts alimentando estas funciones.
 */
import { diffDays, toMinutes } from "../lib/time";
import type { Block, Range } from "../types";

export const CELL = 15;

/** Tramos de 15 min que ocupa un servicio que empieza en `startMin`. */
export function cellsFor(startMin: number, durationMin: number): number[] {
  const n = Math.ceil(durationMin / CELL);
  return Array.from({ length: n }, (_, i) => startMin + i * CELL);
}

export interface SlotContext {
  date: string;
  today: string;
  nowMin: number;
  ranges: Range[];
  blocks: Block[];
  /** Tramos ocupados por otras reservas */
  occupied: Set<number>;
  minAdvanceHours: number;
  maxDaysAhead: number;
  slotStepMin: number;
  /** true para clientes (respeta antelación y límite de días); false para el administrador */
  enforceWindow: boolean;
}

/** Horas de inicio posibles (en minutos desde medianoche). */
export function computeSlots(ctx: SlotContext, durationMin: number): number[] {
  if (!ctx.ranges.length || ctx.date < ctx.today) return [];
  if (ctx.enforceWindow && diffDays(ctx.today, ctx.date) > ctx.maxDaysAhead) return [];

  const dayOffsetMin = diffDays(ctx.today, ctx.date) * 1440;
  const minLead = ctx.enforceWindow ? ctx.minAdvanceHours * 60 : 0;
  const out: number[] = [];

  for (const r of ctx.ranges) {
    const s = toMinutes(r.start);
    const e = toMinutes(r.end);
    for (let t = s; t + durationMin <= e; t += ctx.slotStepMin) {
      if (dayOffsetMin + t - ctx.nowMin < minLead) continue;
      if (cellsFor(t, durationMin).some((c) => ctx.occupied.has(c))) continue;
      const end = t + durationMin;
      if (ctx.blocks.some((b) => t < toMinutes(b.end) && end > toMinutes(b.start))) continue;
      out.push(t);
    }
  }
  return out;
}
