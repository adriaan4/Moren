"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { formatDateEs, formatPrice } from "@/lib/time";
import { SlotPicker } from "./SlotPicker";

interface MyBooking {
  id: string;
  status: string;
  date: string;
  time: string;
  endTime: string;
  service: { serviceId: string; name: string; priceCents: number; durationMin: number };
  canModify: boolean;
  canCancel: boolean;
}
interface MyData {
  customer: { firstName: string; lastName: string; email: string } | null;
  policy: { cancelMinHours: number; modifyMinHours: number; allowServiceChange: boolean; phone: string };
  upcoming: MyBooking[];
  history: MyBooking[];
}
interface Svc { id: string; name: string; priceCents: number }

const STATUS: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada", cancelled: "Cancelada", completed: "Completada", no_show: "No presentado" };

export function MyAppointments({ linkError }: { linkError?: boolean }) {
  const [data, setData] = useState<MyData | null>(null);
  const [state, setState] = useState<"loading" | "anon" | "ready">("loading");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ date: string | null; time: string | null }>({ date: null, time: null });
  const [svcId, setSvcId] = useState<string>("");
  const [services, setServices] = useState<Svc[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<MyData>("/api/my/bookings"));
      setState("ready");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setState("anon");
      else {
        setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
        setState("anon");
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function startEdit(b: MyBooking) {
    setEditing(b.id);
    setSlot({ date: null, time: null });
    setSvcId(b.service.serviceId);
    setMsg(null);
    if (data?.policy.allowServiceChange && !services.length) {
      const r = await api<{ services: Svc[] }>("/api/services");
      setServices(r.services);
    }
  }

  async function saveEdit(b: MyBooking) {
    if (!slot.date || !slot.time) return;
    setBusy(true);
    try {
      await api(`/api/my/bookings/${b.id}`, { method: "PATCH", body: { date: slot.date, time: slot.time, serviceId: svcId !== b.service.serviceId ? svcId : undefined } });
      setMsg({ type: "ok", text: "Cita modificada. Te hemos enviado un correo de confirmación." });
      setEditing(null);
      await load();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally { setBusy(false); }
  }

  async function cancel(b: MyBooking) {
    if (!window.confirm(`¿Cancelar la cita del ${formatDateEs(b.date)} a las ${b.time}?`)) return;
    setBusy(true);
    try {
      await api(`/api/my/bookings/${b.id}/cancel`, { method: "POST", body: {} });
      setMsg({ type: "ok", text: "Cita cancelada." });
      await load();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally { setBusy(false); }
  }

  async function logout() {
    await api("/api/my/logout", { method: "POST", body: {} });
    setData(null);
    setState("anon");
  }

  if (state === "loading") return <div className="h-40 animate-pulse bg-graphite" />;
  if (state === "anon") return <RequestLink linkError={linkError} initialError={msg?.type === "err" ? msg.text : undefined} />;
  if (!data) return null;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-bone/80">Hola, <strong className="text-bone">{data.customer?.firstName}</strong>. Estas son tus citas.</p>
        <button type="button" className="btn-ghost btn-sm" onClick={logout}>Cerrar sesión</button>
      </div>

      {msg && <p role="status" className={`border p-4 text-sm ${msg.type === "ok" ? "border-gold/40 bg-gold/10 text-gold-light" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>{msg.text}</p>}

      <section>
        <h2 className="mb-5 font-display text-2xl">Próximas citas</h2>
        {data.upcoming.length === 0 ? (
          <p className="border border-dashed border-steel p-6 text-sm text-ash">No tienes citas próximas. <a href="/reservar" className="text-gold underline">Reservar una cita</a></p>
        ) : (
          <ul className="space-y-4">
            {data.upcoming.map((b) => (
              <li key={b.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl capitalize">{formatDateEs(b.date)} · {b.time} h</p>
                    <p className="mt-1 text-sm text-bone/80">{b.service.name} · {formatPrice(b.service.priceCents)}</p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-ash">{b.id} · {STATUS[b.status]}</p>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <button type="button" disabled={!b.canModify || busy} onClick={() => (editing === b.id ? setEditing(null) : startEdit(b))} className="btn-outline btn-sm flex-1 sm:flex-none">{editing === b.id ? "Cerrar" : "Modificar"}</button>
                    <button type="button" disabled={!b.canCancel || busy} onClick={() => cancel(b)} className="btn-ghost btn-sm flex-1 sm:flex-none">Cancelar</button>
                  </div>
                </div>
                {(!b.canModify || !b.canCancel) && (
                  <p className="mt-3 text-xs text-ash">
                    Los cambios online se permiten hasta {data.policy.modifyMinHours} h antes (modificar) y {data.policy.cancelMinHours} h antes (cancelar). Para cambios de última hora llama al {data.policy.phone}.
                  </p>
                )}
                {editing === b.id && (
                  <div className="mt-6 space-y-6 border-t border-steel pt-6">
                    {data.policy.allowServiceChange && services.length > 0 && (
                      <label className="block max-w-sm">
                        <span className="label">Servicio</span>
                        <select className="input" value={svcId} onChange={(e) => { setSvcId(e.target.value); setSlot({ date: null, time: null }); }}>
                          {services.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.priceCents)}</option>)}
                        </select>
                      </label>
                    )}
                    <SlotPicker serviceId={svcId} excludeBookingId={b.id} value={slot} onChange={setSlot} />
                    <button type="button" className="btn-gold" disabled={!slot.date || !slot.time || busy} onClick={() => saveEdit(b)}>Guardar cambios</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-5 font-display text-2xl">Historial</h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-ash">Aún no hay citas anteriores.</p>
        ) : (
          <ul className="divide-y divide-steel border-y border-steel text-sm">
            {data.history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="capitalize">{formatDateEs(b.date, { day: "numeric", month: "long", year: "numeric" })} · {b.time} h</span>
                <span className="text-bone/70">{b.service.name}</span>
                <span className="text-xs uppercase tracking-widest text-ash">{STATUS[b.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RequestLink({ linkError, initialError }: { linkError?: boolean; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/my/request-link", { body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <div className="card max-w-lg p-8">
        <h2 className="font-display text-2xl">Revisa tu correo</h2>
        <p className="mt-3 text-sm leading-relaxed text-bone/80">Si hay citas asociadas a <strong>{email}</strong>, te hemos enviado un enlace seguro para gestionarlas. Caduca en 30 minutos.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="card max-w-lg space-y-5 p-8">
      <h2 className="font-display text-2xl">Accede a tus citas</h2>
      <p className="text-sm text-bone/75">Escribe el correo con el que reservaste y te enviaremos un enlace seguro. Sin contraseñas.</p>
      {linkError && <p role="alert" className="text-sm text-red-300">El enlace no es válido o ha caducado. Solicita uno nuevo.</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <label className="block">
        <span className="label">Correo electrónico</span>
        <input className="input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="submit" className="btn-gold w-full" disabled={busy}>{busy ? "Enviando…" : "Enviarme el enlace"}</button>
    </form>
  );
}
