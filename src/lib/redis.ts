import { Redis } from "@upstash/redis";

let client: Redis | null = null;

function getClient(): Redis {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Faltan las variables UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN");
  }
  client = new Redis({ url, token });
  return client;
}

/**
 * Cliente Redis perezoso: no se conecta hasta el primer uso, de modo que
 * `next build` no necesita credenciales. Solo se usa desde los repositorios.
 */
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(c) : value;
  },
});
