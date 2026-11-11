import { redis } from "@/lib/redis";
import { EPHEMERAL_PREFIXES, keys } from "@/lib/keys";

type Entry =
  | { k: string; t: "string"; v: unknown }
  | { k: string; t: "hash"; v: Record<string, unknown> }
  | { k: string; t: "set"; v: unknown[] }
  | { k: string; t: "zset"; v: { member: unknown; score: number }[] };

export interface Snapshot {
  version: 1;
  createdAt: string;
  entries: Entry[];
}

const MAX_BACKUPS = 14;

async function scanAll(): Promise<string[]> {
  const found: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, batch]: [string | number, string[]] = await redis.scan(cursor, { match: `${keys.prefix}*`, count: 500 });
    cursor = next;
    found.push(...batch);
  } while (String(cursor) !== "0");
  return found.filter((k) => !EPHEMERAL_PREFIXES.some((p) => k.startsWith(p)));
}

/** Exporta todos los datos persistentes (no efímeros) a un objeto JSON. */
export async function exportSnapshot(): Promise<Snapshot> {
  const entries: Entry[] = [];
  for (const k of await scanAll()) {
    const t = await redis.type(k);
    if (t === "string") entries.push({ k, t, v: await redis.get(k) });
    else if (t === "hash") entries.push({ k, t, v: (await redis.hgetall(k)) ?? {} });
    else if (t === "set") entries.push({ k, t, v: (await redis.smembers(k)) as unknown[] });
    else if (t === "zset") {
      const raw = (await redis.zrange(k, 0, -1, { withScores: true })) as unknown[];
      const v: { member: unknown; score: number }[] = [];
      for (let i = 0; i < raw.length; i += 2) v.push({ member: raw[i], score: Number(raw[i + 1]) });
      entries.push({ k, t, v });
    }
  }
  return { version: 1, createdAt: new Date().toISOString(), entries };
}

/** Guarda una copia dentro del propio Redis (rotación de las últimas MAX_BACKUPS). */
export async function createBackup(): Promise<{ id: string; entries: number }> {
  const snap = await exportSnapshot();
  const id = snap.createdAt.replace(/[:.]/g, "-");
  await redis.set(keys.backup(id), snap);
  await redis.zadd(keys.backupsIdx, { score: Date.now(), member: id });
  const ids = (await redis.zrange<string[]>(keys.backupsIdx, 0, -1)) ?? [];
  for (const old of ids.slice(0, Math.max(0, ids.length - MAX_BACKUPS))) {
    await redis.del(keys.backup(old));
    await redis.zrem(keys.backupsIdx, old);
  }
  return { id, entries: snap.entries.length };
}

export async function listBackups(): Promise<string[]> {
  return ((await redis.zrange<string[]>(keys.backupsIdx, 0, -1, { rev: true })) ?? []) as string[];
}

export async function getBackup(id: string): Promise<Snapshot | null> {
  return (await redis.get<Snapshot>(keys.backup(id))) ?? null;
}

/**
 * Restaura una copia. Antes crea otra copia de seguridad del estado actual.
 * Los tramos horarios (slots) se reconstruyen a partir de las reservas activas.
 */
export async function restoreSnapshot(snap: Snapshot): Promise<{ restored: number }> {
  if (snap.version !== 1 || !Array.isArray(snap.entries)) throw new Error("Copia no válida");
  await createBackup();
  for (const k of await scanAll()) await redis.del(k);
  for (const e of snap.entries) {
    if (!e.k.startsWith(keys.prefix)) continue;
    if (e.t === "string") await redis.set(e.k, e.v);
    else if (e.t === "hash" && Object.keys(e.v).length) await redis.hset(e.k, e.v as Record<string, unknown>);
    else if (e.t === "set" && e.v.length) await redis.sadd(e.k, e.v[0] as string, ...(e.v.slice(1) as string[]));
    else if (e.t === "zset" && e.v.length) {
      const [first, ...rest] = e.v as { member: string; score: number }[];
      await redis.zadd(e.k, first, ...rest);
    }
  }
  await rebuildSlotLocks();
  return { restored: snap.entries.length };
}

/** Recrea los bloqueos de horario a partir de las reservas activas (tras una restauración). */
export async function rebuildSlotLocks(): Promise<number> {
  const { listAll, lockCells } = await import("@/repositories/bookingRepo");
  const { cellsFor } = await import("./availability");
  const { toMinutes } = await import("@/lib/time");
  let n = 0;
  for (const b of await listAll()) {
    if (b.status !== "pending" && b.status !== "confirmed") continue;
    if (await lockCells(b.date, cellsFor(toMinutes(b.time), b.service.durationMin), b.id)) n++;
  }
  return n;
}
