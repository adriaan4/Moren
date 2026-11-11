import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { newId } from "@/lib/ids";
import type { Customer, CustomerInfo } from "@/types";

export async function getCustomer(id: string): Promise<Customer | null> {
  return (await redis.get<Customer>(keys.customer(id))) ?? null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const id = await redis.get<string>(keys.customerByEmail(email.toLowerCase()));
  return id ? getCustomer(id) : null;
}

export async function listCustomers(): Promise<Customer[]> {
  const ids = (await redis.smembers(keys.customersAll)) as string[];
  if (!ids.length) return [];
  const items = await redis.mget<(Customer | null)[]>(...ids.map(keys.customer));
  return items.filter((c): c is Customer => !!c).sort((a, b) => a.lastName.localeCompare(b.lastName, "es"));
}

/** Crea el cliente si el correo no existe; si existe, actualiza nombre y teléfono. */
export async function upsertCustomer(info: CustomerInfo, consentAt?: string): Promise<Customer> {
  const now = new Date().toISOString();
  const existing = await getCustomerByEmail(info.email);
  if (existing) {
    const updated: Customer = { ...existing, ...info, consentAt: consentAt ?? existing.consentAt, updatedAt: now };
    await redis.set(keys.customer(existing.id), updated);
    return updated;
  }
  const customer: Customer = { ...info, id: newId("cus"), consentAt, createdAt: now, updatedAt: now };
  await redis.set(keys.customer(customer.id), customer);
  await redis.set(keys.customerByEmail(info.email.toLowerCase()), customer.id);
  await redis.sadd(keys.customersAll, customer.id);
  return customer;
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer | null> {
  const current = await getCustomer(id);
  if (!current) return null;
  const next: Customer = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
  if (patch.email && patch.email !== current.email) {
    await redis.del(keys.customerByEmail(current.email.toLowerCase()));
    await redis.set(keys.customerByEmail(patch.email.toLowerCase()), id);
  }
  await redis.set(keys.customer(id), next);
  return next;
}

export async function deleteCustomer(c: Customer): Promise<void> {
  await redis.del(keys.customer(c.id));
  await redis.del(keys.customerByEmail(c.email.toLowerCase()));
  await redis.srem(keys.customersAll, c.id);
}
