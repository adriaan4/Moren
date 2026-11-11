"use client";

import { useEffect, useState } from "react";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { api } from "@/lib/client/api";
import { formatPrice } from "@/lib/time";
import type { Booking, Service } from "@/types";
import { Field, Notice } from "./ui";

/** Crear una cita (booking = null) o cambiar fecha/hora/servicio de una existente. */
export function BookingForm({ booking, onDone }: { booking: Booking | null; onDone: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState(booking?.service.serviceId ?? "");
  const [slot, setSlot] = useState<{ date: string | null; time: string | null }>({ date: null, time: null });
  const [c, setC] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [status, setStatus] = useState<"confirmed" | "pending">("confirmed");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ services: Service[] }>("/api/admin/services").then((r) => {
      setServices(r.services);
      if (!serviceId && r.services[0]) setServiceId(r.services[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy(true);
    setErr("");
    try {
      if (booking) {
        if (slot.date && slot.time) {
          await api(`/api/admin/bookings/${booking.id}`, { method: "PATCH", body: { action: "reschedule", date: slot.date, time: slot.time, serviceId } });
        }
        if ((booking.notes ?? "") !== notes) await api(`/api/admin/bookings/${booking.id}`, { method: "PATCH", body: { action: "notes", notes } });
      } else {
        await api("/api/admin/bookings", { body: { serviceId, date: slot.date, time: slot.time, customer: c, notes: notes || undefined, status } });
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  const canSave = booking ? (!!slot.date && !!slot.time) || (booking.notes ?? "") !== notes : !!(serviceId && slot.date && slot.time && c.firstName && c.lastName && c.phone && c.email);

  return (
    <div className="space-y-6">
      {err && <Notice kind="err">{err}</Notice>}
      {booking && (
        <p className="text-sm text-bone/80">
          {booking.customer.firstName} {booking.customer.lastName} · {booking.customer.phone} · actual: <strong className="text-gold">{booking.date} {booking.time}</strong> ({booking.service.name}, {formatPrice(booking.service.priceCents)})
        </p>
      )}
      {!booking && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><input className="input" value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} /></Field>
          <Field label="Apellidos"><input className="input" value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} /></Field>
          <Field label="Teléfono"><input className="input" type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
          <Field label="Correo"><input className="input" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></Field>
        </div>
      )}
      <Field label="Servicio" hint={booking ? "Si cambias el servicio, se aplicará el precio actual de la tarifa." : undefined}>
        <select className="input" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlot({ date: null, time: null }); }}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.priceCents)}{s.active ? "" : " (desactivado)"}</option>)}
        </select>
      </Field>
      {serviceId && <SlotPicker endpoint="/api/admin/availability" serviceId={serviceId} excludeBookingId={booking?.id} value={slot} onChange={setSlot} />}
      <Field label="Notas internas"><textarea className="input min-h-[80px] py-3" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {!booking && (
        <Field label="Estado inicial">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "confirmed" | "pending")}>
            <option value="confirmed">Confirmada</option>
            <option value="pending">Pendiente</option>
          </select>
        </Field>
      )}
      <div className="flex justify-end gap-3">
        <button className="btn-ghost" onClick={onDone} disabled={busy}>Cancelar</button>
        <button className="btn-gold" onClick={save} disabled={!canSave || busy}>{busy ? "Guardando…" : booking ? "Guardar cambios" : "Crear cita"}</button>
      </div>
    </div>
  );
}
