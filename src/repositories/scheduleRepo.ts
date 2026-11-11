import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { newId } from "@/lib/ids";
import type { Block, Closure, ScheduleException, WeeklySchedule } from "@/types";

/** Por defecto todos los días están cerrados: el propietario define sus horarios desde el panel. */
export const EMPTY_WEEK: WeeklySchedule = Object.fromEntries(
  ["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, { open: false, ranges: [] }]),
);

export async function getWeekly(): Promise<WeeklySchedule> {
  const stored = await redis.get<WeeklySchedule>(keys.weekly);
  return { ...EMPTY_WEEK, ...(stored ?? {}) };
}

export async function saveWeekly(w: WeeklySchedule): Promise<void> {
  await redis.set(keys.weekly, w);
}

// ── Excepciones por fecha ──
export async function listExceptions(): Promise<ScheduleException[]> {
  const h = await redis.hgetall<Record<string, ScheduleException>>(keys.exceptions);
  return Object.values(h ?? {}).sort((a, b) => a.date.localeCompare(b.date));
}

export async function setException(e: ScheduleException): Promise<void> {
  await redis.hset(keys.exceptions, { [e.date]: e });
}

export async function deleteException(date: string): Promise<void> {
  await redis.hdel(keys.exceptions, date);
}

// ── Bloqueos de horas ──
export async function listBlocks(): Promise<Block[]> {
  const h = await redis.hgetall<Record<string, Block>>(keys.blocks);
  return Object.values(h ?? {}).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

export async function addBlock(b: Omit<Block, "id">): Promise<Block> {
  const block: Block = { ...b, id: newId("blk") };
  await redis.hset(keys.blocks, { [block.id]: block });
  return block;
}

export async function deleteBlock(id: string): Promise<void> {
  await redis.hdel(keys.blocks, id);
}

// ── Vacaciones / festivos ──
export async function listClosures(): Promise<Closure[]> {
  const h = await redis.hgetall<Record<string, Closure>>(keys.closures);
  return Object.values(h ?? {}).sort((a, b) => a.start.localeCompare(b.start));
}

export async function addClosure(c: Omit<Closure, "id">): Promise<Closure> {
  const closure: Closure = { ...c, id: newId("clo") };
  await redis.hset(keys.closures, { [closure.id]: closure });
  return closure;
}

export async function deleteClosure(id: string): Promise<void> {
  await redis.hdel(keys.closures, id);
}
