import { AppError, conflict, forbidden, notFound, badRequest } from "@/lib/errors";
import { newBookingId, newSecret } from "@/lib/ids";
import { fromMinutes, minutesUntil, nowInMadrid, toMinutes } from "@/lib/time";
import { getSettings } from "@/repositories/settingsRepo";
import { getService } from "@/repositories/serviceRepo";
import * as bookingRepo from "@/repositories/bookingRepo";
import * as customerRepo from "@/repositories/customerRepo";
import { ACTIVE_STATUSES, type Booking, type BookingStatus, type CustomerInfo, type Service, type ServiceSnapshot } from "@/types";
import { cellsFor, getAvailableSlots } from "./availability";
import { notify } from "./notificationService";

export interface Actor {
  role: "admin" | "client";
  customerId?: string;
}

const isActive = (s: BookingStatus) => ACTIVE_STATUSES.includes(s);

function snapshot(service: Service, defaultDuration: number): ServiceSnapshot {
  return { serviceId: service.id, name: service.name, priceCents: service.priceCents, durationMin: service.durationMin ?? defaultDuration };
}

export interface CreateInput {
  serviceId: string;
  date: string;
  time: string;
  customer: CustomerInfo;
  notes?: string;
  status?: "pending" | "confirmed";
}

/**
 * Crea una reserva. Orden de seguridad:
 *  1) validar servicio y disponibilidad (backend),
 *  2) bloquear atómicamente los tramos (SET NX),
 *  3) guardar reserva e índices; si algo falla se liberan los tramos.
 */
export async function createBooking(input: CreateInput, source: "web" | "admin"): Promise<Booking> {
  const settings = await getSettings();
  const service = await getService(input.serviceId);
  if (!service || (!service.active && source === "web")) throw badRequest("El servicio seleccionado no está disponible", "SERVICE_UNAVAILABLE");
  const snap = snapshot(service, settings.defaultDurationMin);

  const slots = await getAvailableSlots(input.date, snap.durationMin, { enforceWindow: source === "web" });
  if (!slots.includes(input.time)) throw conflict("SLOT_UNAVAILABLE", "Esa hora ya no está disponible. Elige otra, por favor.");

  const id = newBookingId();
  const startMin = toMinutes(input.time);
  const cells = cellsFor(startMin, snap.durationMin);
  const locked = await bookingRepo.lockCells(input.date, cells, id);
  if (!locked) throw conflict("SLOT_TAKEN", "Alguien acaba de reservar esa hora. Elige otra, por favor.");

  try {
    const now = new Date().toISOString();
    const customer = await customerRepo.upsertCustomer(input.customer, now);
    const status: BookingStatus = source === "admin" ? (input.status ?? "confirmed") : settings.requireApproval ? "pending" : "confirmed";
    const booking: Booking = {
      id,
      accessKey: newSecret(16),
      customerId: customer.id,
      customer: input.customer,
      service: snap,
      date: input.date,
      time: input.time,
      endTime: fromMinutes(startMin + snap.durationMin),
      status,
      notes: input.notes,
      source,
      consentAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await bookingRepo.saveBooking(booking);
    await notify("created", booking);
    return booking;
  } catch (err) {
    await bookingRepo.releaseCells(input.date, cells, id);
    throw err;
  }
}

function assertOwner(booking: Booking, actor: Actor) {
  if (actor.role === "admin") return;
  if (!actor.customerId || booking.customerId !== actor.customerId) throw forbidden("Esta reserva no te pertenece");
}

function assertPolicy(booking: Booking, hoursRequired: number, verb: string) {
  const left = minutesUntil(booking.date, toMinutes(booking.time));
  if (left < 0) throw conflict("IN_THE_PAST", "La cita ya ha pasado");
  if (left < hoursRequired * 60) {
    throw conflict("POLICY", `Solo se puede ${verb} una cita con al menos ${hoursRequired} h de antelación. Llámanos al teléfono del local.`);
  }
}

export async function getBookingOrThrow(id: string): Promise<Booking> {
  const b = await bookingRepo.getBooking(id);
  if (!b) throw notFound("Reserva no encontrada");
  return b;
}

export interface RescheduleInput {
  date: string;
  time: string;
  serviceId?: string;
}

export async function rescheduleBooking(id: string, input: RescheduleInput, actor: Actor): Promise<Booking> {
  const booking = await getBookingOrThrow(id);
  assertOwner(booking, actor);
  if (!isActive(booking.status)) throw conflict("NOT_ACTIVE", "Esta cita ya no se puede modificar");
  const settings = await getSettings();

  if (actor.role === "client") {
    assertPolicy(booking, settings.modifyMinHours, "modificar");
    if (input.serviceId && input.serviceId !== booking.service.serviceId && !settings.allowServiceChange) {
      throw forbidden("No es posible cambiar el servicio. Llámanos si lo necesitas.");
    }
  }

  let snap = booking.service;
  if (input.serviceId && input.serviceId !== booking.service.serviceId) {
    const service = await getService(input.serviceId);
    if (!service || !service.active) throw badRequest("El servicio seleccionado no está disponible", "SERVICE_UNAVAILABLE");
    snap = snapshot(service, settings.defaultDurationMin); // nuevo precio acordado
  }

  const slots = await getAvailableSlots(input.date, snap.durationMin, {
    enforceWindow: actor.role === "client",
    excludeBookingId: booking.id,
  });
  if (!slots.includes(input.time)) throw conflict("SLOT_UNAVAILABLE", "Esa hora no está disponible. Elige otra, por favor.");

  const oldCells = cellsFor(toMinutes(booking.time), booking.service.durationMin);
  const startMin = toMinutes(input.time);
  const newCells = cellsFor(startMin, snap.durationMin);

  // 1) reservar el nuevo horario (los tramos propios cuentan como libres)
  const locked = await bookingRepo.lockCells(input.date, newCells, booking.id);
  if (!locked) throw conflict("SLOT_TAKEN", "Alguien acaba de reservar esa hora. Elige otra, por favor.");

  const updated: Booking = {
    ...booking,
    service: snap,
    date: input.date,
    time: input.time,
    endTime: fromMinutes(startMin + snap.durationMin),
    reminderSentAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  try {
    await bookingRepo.saveBooking(updated);
  } catch (err) {
    if (input.date !== booking.date || !oldCells.every((c) => newCells.includes(c))) {
      await bookingRepo.releaseCells(input.date, newCells.filter((c) => input.date !== booking.date || !oldCells.includes(c)), booking.id);
    }
    throw err;
  }

  // 2) liberar el horario anterior (solo los tramos que ya no se usan)
  const stale = booking.date === input.date ? oldCells.filter((c) => !newCells.includes(c)) : oldCells;
  await bookingRepo.releaseCells(booking.date, stale, booking.id);

  await notify("modified", updated, { previous: { date: booking.date, time: booking.time } });
  return updated;
}

export async function cancelBooking(id: string, actor: Actor): Promise<Booking> {
  const booking = await getBookingOrThrow(id);
  assertOwner(booking, actor);
  if (!isActive(booking.status)) throw conflict("NOT_ACTIVE", "Esta cita ya está cancelada o finalizada");
  if (actor.role === "client") assertPolicy(booking, (await getSettings()).cancelMinHours, "cancelar");
  return applyStatus(booking, "cancelled");
}

async function applyStatus(booking: Booking, status: BookingStatus): Promise<Booking> {
  const updated: Booking = { ...booking, status, updatedAt: new Date().toISOString() };
  if (isActive(booking.status) && !isActive(status)) {
    // La cita deja de ocupar hueco solo si se cancela; completada / no presentada son del pasado
    if (status === "cancelled") {
      await bookingRepo.releaseCells(booking.date, cellsFor(toMinutes(booking.time), booking.service.durationMin), booking.id);
    }
  }
  await bookingRepo.saveBooking(updated);
  if (status === "cancelled") await notify("cancelled", updated);
  if (status === "confirmed" && booking.status === "pending") await notify("created", updated, { skipOwner: true });
  return updated;
}

/** Cambio de estado por el administrador. Reactivar una cita cancelada vuelve a comprobar el hueco. */
export async function setBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  const booking = await getBookingOrThrow(id);
  if (booking.status === status) return booking;
  if (!isActive(booking.status) && isActive(status)) {
    const cells = cellsFor(toMinutes(booking.time), booking.service.durationMin);
    const slots = await getAvailableSlots(booking.date, booking.service.durationMin, { enforceWindow: false, excludeBookingId: booking.id });
    if (!slots.includes(booking.time)) throw conflict("SLOT_UNAVAILABLE", "El hueco de esa cita ya no está libre");
    if (!(await bookingRepo.lockCells(booking.date, cells, booking.id))) throw conflict("SLOT_TAKEN", "El hueco de esa cita ya no está libre");
  }
  return applyStatus(booking, status);
}

export async function updateNotes(id: string, notes: string): Promise<Booking> {
  const booking = await getBookingOrThrow(id);
  const updated = { ...booking, notes, updatedAt: new Date().toISOString() };
  await bookingRepo.saveBooking(updated);
  return updated;
}

export async function deleteBookingAdmin(id: string): Promise<void> {
  const booking = await getBookingOrThrow(id);
  await bookingRepo.releaseCells(booking.date, cellsFor(toMinutes(booking.time), booking.service.durationMin), booking.id);
  await bookingRepo.deleteBooking(booking);
}

/** Vista pública mínima de una reserva (sin notas internas). */
export function publicView(b: Booking) {
  return {
    id: b.id,
    status: b.status,
    date: b.date,
    time: b.time,
    endTime: b.endTime,
    service: b.service,
    customer: { firstName: b.customer.firstName, lastName: b.customer.lastName, email: b.customer.email },
  };
}

export function isUpcoming(b: Booking): boolean {
  const now = nowInMadrid();
  return isActive(b.status) && minutesUntil(b.date, toMinutes(b.time), now) >= 0;
}

export { AppError };
