import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import type { SessionData } from "@/types";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface AdminRecord {
  username: string;
  passwordHash: string;
  createdAt: string;
}

export async function getAdmin(username: string): Promise<AdminRecord | null> {
  return (await redis.get<AdminRecord>(keys.admin(username))) ?? null;
}

export async function saveAdmin(a: AdminRecord): Promise<void> {
  await redis.set(keys.admin(a.username), a);
}

export async function countAdmins(): Promise<number> {
  const [, found] = await redis.scan(0, { match: `${keys.prefix}admin:*`, count: 100 });
  return found.length;
}

// ── Sesiones (el token en la cookie solo existe en el navegador; en Redis se guarda su hash) ──
export async function createSession(token: string, data: SessionData, ttlSec: number): Promise<void> {
  await redis.set(keys.session(sha256(token)), data, { ex: ttlSec });
}

export async function readSession(token: string): Promise<SessionData | null> {
  return (await redis.get<SessionData>(keys.session(sha256(token)))) ?? null;
}

export async function destroySession(token: string): Promise<void> {
  await redis.del(keys.session(sha256(token)));
}

// ── Enlaces mágicos para "Mis citas" ──
export async function saveMagicToken(token: string, customerId: string, ttlSec: number): Promise<void> {
  await redis.set(keys.magic(sha256(token)), customerId, { ex: ttlSec });
}

export async function readMagicToken(token: string): Promise<string | null> {
  return (await redis.get<string>(keys.magic(sha256(token)))) ?? null;
}

// ── Limitador de peticiones ──
export async function hit(name: string, windowSec: number): Promise<number> {
  const key = keys.rate(name);
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n;
}

export async function clearHits(name: string): Promise<void> {
  await redis.del(keys.rate(name));
}

// ── Imágenes subidas por el administrador ──
export async function saveImage(id: string, dataUrl: string): Promise<void> {
  await redis.set(keys.image(id), dataUrl);
}

export async function readImage(id: string): Promise<string | null> {
  return (await redis.get<string>(keys.image(id))) ?? null;
}
