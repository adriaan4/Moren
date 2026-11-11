import * as bookingRepo from "@/repositories/bookingRepo";
import type { Booking, BookingStatus } from "@/types";

export interface BookingFilters {
  q?: string;
  date?: string;
  from?: string;
  to?: string;
  serviceId?: string;
  status?: BookingStatus;
  page: number;
  pageSize: number;
}

/** Listado filtrado de reservas para el panel (búsqueda por nombre, teléfono, correo o código). */
export async function queryBookings(f: BookingFilters): Promise<{ items: Booking[]; total: number }> {
  let list = f.date ? await bookingRepo.listByDate(f.date) : f.from || f.to ? await bookingRepo.listByRange(f.from ?? "2000-01-01", f.to ?? "2999-12-31") : await bookingRepo.listAll();
  if (f.status) list = list.filter((b) => b.status === f.status);
  if (f.serviceId) list = list.filter((b) => b.service.serviceId === f.serviceId);
  if (f.q) {
    const needle = f.q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    list = list.filter(
      (b) =>
        `${b.customer.firstName} ${b.customer.lastName} ${b.customer.email} ${b.id}`.toLowerCase().includes(needle) ||
        (digits.length >= 3 && b.customer.phone.replace(/\D/g, "").includes(digits)),
    );
  }
  list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const total = list.length;
  const start = (f.page - 1) * f.pageSize;
  return { items: list.slice(start, start + f.pageSize), total };
}
