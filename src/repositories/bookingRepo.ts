import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { sortScore, toMinutes } from "@/lib/time";
import type { Booking, BookingStatus } from "@/types";

const CHUNK = 400;

async function mgetBookings(ids: string[]): Promise<Booking[]> {
  const out: Booking[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    if (!part.length) continue;
    const res = await redis.mget<(Booking | null)[]>(...part.map(keys.booking));
    for (const b of res) if (b) out.push(b);
  }
  return out;
}

export async function getBooking(id: string): Promise<Booking | null> {
  return (await redis.get<Booking>(keys.booking(id))) ?? null;
}

/**
 * Guarda la reserva y mantiene los índices (fecha, cliente, estado, global).
 * Si la reserva ya existía, quita los índices antiguos que hayan cambiado.
 */
export async function saveBooking(b: Booking): Promise<void> {
  const prev = await getBooking(b.id);
  await redis.set(keys.booking(b.id), b);
  await redis.sadd(keys.bookingsByDate(b.date), b.id);
  await redis.sadd(keys.bookingsByCustomer(b.customerId), b.id);
  await redis.sadd(keys.bookingsByStatus(b.status), b.id);
  await redis.zadd(keys.bookingsAll, { score: sortScore(b.date, toMinutes(b.time)), member: b.id });
  if (prev) {
    if (prev.date !== b.date) await redis.srem(keys.bookingsByDate(prev.date), b.id);
    if (prev.status !== b.status) await redis.srem(keys.bookingsByStatus(prev.status), b.id);
    if (prev.customerId !== b.customerId) await redis.srem(keys.bookingsByCustomer(prev.customerId), b.id);
  }
}

export async function deleteBooking(b: Booking): Promise<void> {
  await redis.del(keys.booking(b.id));
  await redis.srem(keys.bookingsByDate(b.date), b.id);
  await redis.srem(keys.bookingsByCustomer(b.customerId), b.id);
  await redis.srem(keys.bookingsByStatus(b.status), b.id);
  await redis.zrem(keys.bookingsAll, b.id);
}

export async function listByDate(date: string): Promise<Booking[]> {
  const ids = await redis.smembers(keys.bookingsByDate(date));
  return (await mgetBookings(ids as string[])).sort((a, b) => a.time.localeCompare(b.time));
}

export async function listByCustomer(customerId: string): Promise<Booking[]> {
  const ids = await redis.smembers(keys.bookingsByCustomer(customerId));
  return (await mgetBookings(ids as string[])).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

export async function listAllIds(): Promise<string[]> {
  return (await redis.zrange<string[]>(keys.bookingsAll, 0, -1, { rev: true })) ?? [];
}

export async function listAll(): Promise<Booking[]> {
  return mgetBookings(await listAllIds());
}

export async function listByRange(from: string, to: string): Promise<Booking[]> {
  const min = sortScore(from, 0);
  const max = sortScore(to, 9999);
  const ids = await redis.zrange<string[]>(keys.bookingsAll, min, max, { byScore: true });
  return (await mgetBookings(ids)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export async function listByStatus(status: BookingStatus): Promise<Booking[]> {
  return mgetBookings((await redis.smembers(keys.bookingsByStatus(status))) as string[]);
}

// ── Bloqueo atómico de tramos de 15 min ──────────────────────────────────

/**
 * Intenta reservar todos los tramos con SET NX (atómico por clave). Si un tramo ya lo
 * tiene otra reserva, libera lo adquirido y devuelve false. Los tramos que ya pertenecen
 * a `bookingId` se consideran propios (modificación de cita).
 */
export async function lockCells(date: string, cells: number[], bookingId: string): Promise<boolean> {
  const acquired: number[] = [];
  for (const c of cells) {
    const key = keys.slot(date, c);
    const ok = await redis.set(key, bookingId, { nx: true, ex: 60 * 60 * 24 * 400 });
    if (ok) {
      acquired.push(c);
      continue;
    }
    const owner = await redis.get<string>(key);
    if (owner !== bookingId) {
      await releaseCells(date, acquired, bookingId);
      return false;
    }
  }
  return true;
}

/** Libera solo los tramos que pertenecen a esa reserva. */
export async function releaseCells(date: string, cells: number[], bookingId: string): Promise<void> {
  for (const c of cells) {
    const key = keys.slot(date, c);
    const owner = await redis.get<string>(key);
    if (owner === bookingId) await redis.del(key);
  }
}

export async function getOccupiedCells(date: string, cells: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!cells.length) return map;
  const values = await redis.mget<(string | null)[]>(...cells.map((c) => keys.slot(date, c)));
  values.forEach((v, i) => {
    if (v) map.set(cells[i], v);
  });
  return map;
}
