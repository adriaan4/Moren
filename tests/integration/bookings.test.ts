import { describe, expect, it } from "vitest";
import { customer, nextWeekday, seed } from "../helpers/fixtures";
import { sentEmails } from "../helpers/setup";
import * as bookingRepo from "../../src/repositories/bookingRepo";
import * as scheduleRepo from "../../src/repositories/scheduleRepo";
import { updateService } from "../../src/repositories/serviceRepo";
import { getAvailableSlots, getMonthOverview } from "../../src/services/availability";
import { cancelBooking, createBooking, rescheduleBooking, setBookingStatus } from "../../src/services/bookingService";
import { sendDueReminders } from "../../src/services/reminderService";
import { addDays } from "../../src/lib/time";

const monday = () => nextWeekday(1, 5);

describe("reservas (servicio + Redis simulado)", () => {
  it("1. crea una reserva, la guarda con identificador único y envía correo", async () => {
    const { corte } = await seed();
    const date = monday();
    const b = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer() }, "web");
    expect(b.id).toMatch(/^MOR-[A-Z0-9]{6}$/);
    expect(b.status).toBe("confirmed");
    expect((await bookingRepo.getBooking(b.id))?.time).toBe("10:00");
    expect((await bookingRepo.listByDate(date)).map((x) => x.id)).toContain(b.id);
    expect(sentEmails.some((m) => m.to === "cliente1@example.com" && m.subject.includes(b.id))).toBe(true);
  });

  it("rechaza horas fuera de horario y en descanso", async () => {
    const { corte } = await seed();
    const date = monday();
    for (const time of ["08:00", "14:30", "20:00"]) {
      await expect(createBooking({ serviceId: corte.id, date, time, customer: customer() }, "web")).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    }
    await expect(createBooking({ serviceId: corte.id, date: nextWeekday(0, 5), time: "10:00", customer: customer() }, "web")).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("4. dos clientes no pueden reservar la misma hora (ni solaparse), ni en paralelo", async () => {
    const { corte } = await seed();
    const date = monday();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => createBooking({ serviceId: corte.id, date, time: "11:00", customer: customer(i + 1) }, "web")),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(createBooking({ serviceId: corte.id, date, time: "11:15", customer: customer(9) }, "web")).rejects.toBeTruthy();
    expect((await getAvailableSlots(date, 30)).includes("11:00")).toBe(false);
  });

  it("2/5. modificar una cita reserva el nuevo hueco y libera el anterior", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer(1) }, "web");
    const moved = await rescheduleBooking(a.id, { date, time: "12:00" }, { role: "admin" });
    expect(moved.time).toBe("12:00");
    const slots = await getAvailableSlots(date, 30);
    expect(slots).toContain("10:00");
    expect(slots).not.toContain("12:00");
    // otro cliente ya puede coger el hueco liberado
    await expect(createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer(2) }, "web")).resolves.toBeTruthy();
    // índice por fecha consistente al cambiar de día
    const other = addDays(date, 1);
    await rescheduleBooking(a.id, { date: other, time: "09:00" }, { role: "admin" });
    expect((await bookingRepo.listByDate(date)).map((x) => x.id)).not.toContain(a.id);
    expect((await bookingRepo.listByDate(other)).map((x) => x.id)).toContain(a.id);
    expect(sentEmails.filter((m) => m.subject.startsWith("Cita modificada"))).toHaveLength(2);
  });

  it("modificar una cita puede reutilizar su propio hueco (mover 15 min)", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer() }, "web");
    const moved = await rescheduleBooking(a.id, { date, time: "10:15" }, { role: "admin" });
    expect(moved.time).toBe("10:15");
    const slots = await getAvailableSlots(date, 30);
    // la cita ocupa ahora 10:15-10:45
    expect(slots).toContain("09:30");
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("10:45");
  });

  it("3. cancelar libera el hueco y avisa al cliente", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer() }, "web");
    const c = await cancelBooking(a.id, { role: "client", customerId: a.customerId });
    expect(c.status).toBe("cancelled");
    expect(await getAvailableSlots(date, 30)).toContain("10:00");
    expect(sentEmails.some((m) => m.subject.startsWith("Cita cancelada"))).toBe(true);
    await expect(cancelBooking(a.id, { role: "admin" })).rejects.toMatchObject({ code: "NOT_ACTIVE" });
  });

  it("11. un cliente no puede ver/modificar/cancelar reservas ajenas", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer(1) }, "web");
    const b = await createBooking({ serviceId: corte.id, date, time: "12:00", customer: customer(2) }, "web");
    const intruder = { role: "client" as const, customerId: b.customerId };
    await expect(cancelBooking(a.id, intruder)).rejects.toMatchObject({ status: 403 });
    await expect(rescheduleBooking(a.id, { date, time: "13:00" }, intruder)).rejects.toMatchObject({ status: 403 });
    expect((await bookingRepo.getBooking(a.id))?.status).toBe("confirmed");
    expect((await bookingRepo.listByCustomer(b.customerId)).every((x) => x.customerId === b.customerId)).toBe(true);
  });

  it("política de cancelación: el cliente no puede cancelar/modificar fuera de plazo", async () => {
    const { corte } = await seed({ cancelMinHours: 24 * 30, modifyMinHours: 24 * 30 });
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer() }, "web");
    const client = { role: "client" as const, customerId: a.customerId };
    await expect(cancelBooking(a.id, client)).rejects.toMatchObject({ code: "POLICY" });
    await expect(rescheduleBooking(a.id, { date, time: "11:00" }, client)).rejects.toMatchObject({ code: "POLICY" });
    await expect(cancelBooking(a.id, { role: "admin" })).resolves.toBeTruthy(); // el admin siempre puede
  });

  it("6. las vacaciones bloquean todos los días del rango sin crearlos uno a uno", async () => {
    const { corte } = await seed();
    const from = monday();
    const to = addDays(from, 6);
    await scheduleRepo.addClosure({ kind: "vacation", start: from, end: to, reason: "Vacaciones", showBanner: true });
    for (let i = 0; i <= 6; i++) expect(await getAvailableSlots(addDays(from, i), 30)).toEqual([]);
    await expect(createBooking({ serviceId: corte.id, date: addDays(from, 2), time: "10:00", customer: customer() }, "web")).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    const month = await getMonthOverview(from.slice(0, 7), 30);
    expect(month.find((d) => d.date === from)?.status).toBe("closed");
    expect(month.find((d) => d.date === from)?.label).toBe("Vacaciones");
    // el día siguiente al cierre vuelve a estar disponible
    expect((await getAvailableSlots(addDays(to, 1), 30)).length).toBeGreaterThan(0);
  });

  it("las vacaciones no borran las citas existentes", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer() }, "web");
    await scheduleRepo.addClosure({ kind: "vacation", start: date, end: date, reason: "Cierre", showBanner: true });
    expect((await bookingRepo.listByDate(date)).map((x) => x.id)).toContain(a.id);
  });

  it("7. excepciones y bloqueos cambian la disponibilidad", async () => {
    const { corte } = await seed();
    const date = monday();
    await scheduleRepo.setException({ date, closed: false, ranges: [{ start: "10:00", end: "12:00" }] });
    const slots = await getAvailableSlots(date, 30);
    expect(slots[0]).toBe("10:00");
    expect(slots[slots.length - 1]).toBe("11:30");
    await scheduleRepo.addBlock({ date, start: "10:00", end: "11:00" });
    expect((await getAvailableSlots(date, 30))[0]).toBe("11:00");
    await expect(createBooking({ serviceId: corte.id, date, time: "10:30", customer: customer() }, "web")).rejects.toBeTruthy();
  });

  it("8-10. los precios cambian en la tarifa pero cada reserva conserva el suyo", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer() }, "web");
    await updateService(corte.id, { name: "Corte nuevo", priceCents: 2500, durationMin: 45 });
    const stored = await bookingRepo.getBooking(a.id);
    expect(stored?.service).toMatchObject({ name: "Corte de prueba", priceCents: 1500, durationMin: 30 });
    const b = await createBooking({ serviceId: corte.id, date, time: "12:00", customer: customer(2) }, "web");
    expect(b.service).toMatchObject({ name: "Corte nuevo", priceCents: 2500, durationMin: 45 });
    // al editar una cita la duración congelada (30 min) sigue liberando sus tramos reales
    await cancelBooking(a.id, { role: "admin" });
    expect(await getAvailableSlots(date, 15)).toContain("10:00");
    expect(await getAvailableSlots(date, 15)).toContain("10:15");
  });

  it("los servicios desactivados no se pueden reservar en la web", async () => {
    const { corte } = await seed();
    await updateService(corte.id, { active: false });
    await expect(createBooking({ serviceId: corte.id, date: monday(), time: "10:00", customer: customer() }, "web")).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("reactivar una cita cancelada comprueba que el hueco siga libre", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer(1) }, "web");
    await cancelBooking(a.id, { role: "admin" });
    await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer(2) }, "web");
    await expect(setBookingStatus(a.id, "confirmed")).rejects.toMatchObject({ status: 409 });
  });

  it("recordatorio 24 h antes: solo una vez y solo citas confirmadas", async () => {
    const { corte } = await seed();
    const date = monday();
    const a = await createBooking({ serviceId: corte.id, date, time: "10:00", customer: customer() }, "admin");
    // Movemos la cita a "dentro de 10 horas" (hora de Madrid)
    const { nowInMadrid, fromMinutes } = await import("../../src/lib/time");
    const now = nowInMadrid();
    const total = now.minutes + 600;
    const when = total >= 1440 ? { date: addDays(now.date, 1), min: total - 1440 } : { date: now.date, min: total };
    await bookingRepo.saveBooking({ ...a, date: when.date, time: fromMinutes(when.min), endTime: fromMinutes(when.min) });
    sentEmails.length = 0;
    const first = await sendDueReminders();
    const second = await sendDueReminders();
    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
    expect(sentEmails.filter((m) => m.subject.startsWith("Recordatorio"))).toHaveLength(1);
  });
});
