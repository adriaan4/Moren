import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { newId } from "@/lib/ids";
import type { Service } from "@/types";

export async function listServices(opts: { onlyActive?: boolean } = {}): Promise<Service[]> {
  const ids = await redis.zrange<string[]>(keys.servicesIdx, 0, -1);
  if (!ids.length) return [];
  const items = await redis.mget<(Service | null)[]>(...ids.map(keys.service));
  const list = items.filter((s): s is Service => !!s);
  return opts.onlyActive ? list.filter((s) => s.active) : list;
}

export async function getService(id: string): Promise<Service | null> {
  return (await redis.get<Service>(keys.service(id))) ?? null;
}

export async function createService(input: Omit<Service, "id" | "order">): Promise<Service> {
  const all = await listServices();
  const order = all.length ? Math.max(...all.map((s) => s.order)) + 1 : 0;
  const service: Service = { ...input, id: newId("svc"), order };
  await redis.set(keys.service(service.id), service);
  await redis.zadd(keys.servicesIdx, { score: order, member: service.id });
  return service;
}

export async function updateService(id: string, patch: Partial<Omit<Service, "id" | "durationMin">> & { durationMin?: number | null }): Promise<Service | null> {
  const current = await getService(id);
  if (!current) return null;
  const { durationMin, ...rest } = patch;
  const next: Service = { ...current, ...rest, id };
  if (durationMin === null) delete next.durationMin;
  else if (durationMin !== undefined) next.durationMin = durationMin;
  await redis.set(keys.service(id), next);
  return next;
}

export async function deleteService(id: string): Promise<void> {
  await redis.zrem(keys.servicesIdx, id);
  await redis.del(keys.service(id));
}

export async function reorderServices(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    const s = await getService(ids[i]);
    if (!s) continue;
    await redis.set(keys.service(s.id), { ...s, order: i });
    await redis.zadd(keys.servicesIdx, { score: i, member: s.id });
  }
}
