/**
 * Redis en memoria con la parte de la API de @upstash/redis que usa la aplicación.
 * Serializa a JSON como hace Upstash, para detectar errores de (de)serialización.
 */
type Val = unknown;

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export class FakeRedis {
  private str = new Map<string, Val>();
  private hashes = new Map<string, Map<string, Val>>();
  private sets = new Map<string, Set<string>>();
  private zsets = new Map<string, Map<string, number>>();

  reset() {
    this.str.clear();
    this.hashes.clear();
    this.sets.clear();
    this.zsets.clear();
  }

  async get<T = Val>(k: string): Promise<T | null> {
    return this.str.has(k) ? (clone(this.str.get(k)) as T) : null;
  }
  async mget<T = Val>(...keys: string[]): Promise<T> {
    return keys.map((k) => (this.str.has(k) ? clone(this.str.get(k)) : null)) as T;
  }
  /** SET con soporte de NX: atómico, porque Node ejecuta cada llamada síncrona de una vez. */
  async set(k: string, v: Val, opts?: { nx?: boolean; ex?: number }): Promise<"OK" | null> {
    if (opts?.nx && this.str.has(k)) return null;
    this.str.set(k, clone(v));
    return "OK";
  }
  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) {
      if (this.str.delete(k) || this.hashes.delete(k) || this.sets.delete(k) || this.zsets.delete(k)) n++;
    }
    return n;
  }
  async incr(k: string): Promise<number> {
    const n = Number(this.str.get(k) ?? 0) + 1;
    this.str.set(k, n);
    return n;
  }
  async expire(): Promise<number> {
    return 1;
  }

  async sadd(k: string, ...members: string[]): Promise<number> {
    const s = this.sets.get(k) ?? new Set<string>();
    this.sets.set(k, s);
    let n = 0;
    for (const m of members) if (!s.has(m)) (s.add(m), n++);
    return n;
  }
  async srem(k: string, ...members: string[]): Promise<number> {
    const s = this.sets.get(k);
    if (!s) return 0;
    let n = 0;
    for (const m of members) if (s.delete(m)) n++;
    if (!s.size) this.sets.delete(k);
    return n;
  }
  async smembers(k: string): Promise<string[]> {
    return [...(this.sets.get(k) ?? [])];
  }

  async zadd(k: string, ...items: { score: number; member: string }[]): Promise<number> {
    const z = this.zsets.get(k) ?? new Map<string, number>();
    this.zsets.set(k, z);
    for (const i of items) z.set(i.member, i.score);
    return items.length;
  }
  async zrem(k: string, ...members: string[]): Promise<number> {
    const z = this.zsets.get(k);
    if (!z) return 0;
    let n = 0;
    for (const m of members) if (z.delete(m)) n++;
    return n;
  }
  async zrange(k: string, min: number, max: number, opts: { rev?: boolean; byScore?: boolean; withScores?: boolean } = {}): Promise<unknown[]> {
    const z = this.zsets.get(k) ?? new Map<string, number>();
    let entries = [...z.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
    if (opts.byScore) entries = entries.filter(([, s]) => s >= min && s <= max);
    else {
      const end = max < 0 ? entries.length + max + 1 : max + 1;
      if (opts.rev) entries.reverse();
      entries = entries.slice(min, end);
    }
    if (opts.rev && opts.byScore) entries.reverse();
    return opts.withScores ? entries.flatMap(([m, s]) => [m, s]) : entries.map(([m]) => m);
  }

  async hset(k: string, obj: Record<string, Val>): Promise<number> {
    const h = this.hashes.get(k) ?? new Map<string, Val>();
    this.hashes.set(k, h);
    for (const [f, v] of Object.entries(obj)) h.set(f, clone(v));
    return Object.keys(obj).length;
  }
  async hdel(k: string, ...fields: string[]): Promise<number> {
    const h = this.hashes.get(k);
    if (!h) return 0;
    let n = 0;
    for (const f of fields) if (h.delete(f)) n++;
    return n;
  }
  async hgetall<T = Record<string, Val>>(k: string): Promise<T | null> {
    const h = this.hashes.get(k);
    return h && h.size ? (Object.fromEntries([...h.entries()].map(([f, v]) => [f, clone(v)])) as T) : null;
  }

  async type(k: string): Promise<string> {
    if (this.str.has(k)) return "string";
    if (this.hashes.has(k)) return "hash";
    if (this.sets.has(k)) return "set";
    if (this.zsets.has(k)) return "zset";
    return "none";
  }
  async scan(_cursor: number | string, opts: { match?: string } = {}): Promise<[string, string[]]> {
    const all = [...this.str.keys(), ...this.hashes.keys(), ...this.sets.keys(), ...this.zsets.keys()];
    const prefix = opts.match?.replace(/\*$/, "") ?? "";
    return ["0", all.filter((k) => k.startsWith(prefix))];
  }
}

export const fakeRedis = new FakeRedis();
