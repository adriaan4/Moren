import { notFound } from "@/lib/errors";
import * as bookingRepo from "@/repositories/bookingRepo";
import * as customerRepo from "@/repositories/customerRepo";
import { customerStats } from "./statsService";

export async function listCustomersWithStats(q?: string) {
  const [customers, bookings] = await Promise.all([customerRepo.listCustomers(), bookingRepo.listAll()]);
  const byCustomer = new Map<string, typeof bookings>();
  for (const b of bookings) byCustomer.set(b.customerId, [...(byCustomer.get(b.customerId) ?? []), b]);
  const needle = q?.trim().toLowerCase();
  return customers
    .filter((c) => !needle || `${c.firstName} ${c.lastName} ${c.phone} ${c.email}`.toLowerCase().includes(needle))
    .map((c) => ({ ...c, stats: customerStats(byCustomer.get(c.id) ?? []) }));
}

export async function getCustomerDetail(id: string) {
  const customer = await customerRepo.getCustomer(id);
  if (!customer) throw notFound("Cliente no encontrado");
  const bookings = await bookingRepo.listByCustomer(id);
  return { customer, bookings, stats: customerStats(bookings) };
}

/** Derecho de supresión (RGPD): elimina al cliente y anonimiza sus reservas históricas. */
export async function eraseCustomer(id: string): Promise<void> {
  const customer = await customerRepo.getCustomer(id);
  if (!customer) throw notFound("Cliente no encontrado");
  const bookings = await bookingRepo.listByCustomer(id);
  for (const b of bookings) {
    await bookingRepo.saveBooking({
      ...b,
      customer: { firstName: "Cliente", lastName: "eliminado", phone: "", email: "" },
      notes: undefined,
    });
  }
  await customerRepo.deleteCustomer(customer);
}
