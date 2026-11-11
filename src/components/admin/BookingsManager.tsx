"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { formatDateEs, formatPrice } from "@/lib/time";
import type { Booking, BookingStatus, Service } from "@/types";
import { BookingForm } from "./BookingForm";
import { AdminTitle, Modal, Notice, StatusBadge, STATUS_LABEL } from "./ui";

const PAGE = 20;

export function BookingsManager() {
  const [f, setF] = useState({ q: "", date: "", serviceId: "", status: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Booking[]; total: number } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [modal, setModal] = useState<null | { booking: Booking | null }>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE) });
    (Object.entries(f) as [string, string][]).forEach(([k, v]) => v && p.set(k, v));
    try {
      setData(await api(`/api/admin/bookings?${p}`));
    } catch (e) {
      setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" });
    }
  }, [f, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => { api<{ services: Service[] }>("/api/admin/services").then((r) => setServices(r.services)); }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setF((prev) => ({ ...prev, q }));
  }, []);

  async function act(b: Booking, body: object, ok: string) {
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: "PATCH", body });
      setMsg({ k: "ok", t: ok });
      setDetail(null);
      load();
    } catch (e) {
      setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" });
    }
  }
  async function remove(b: Booking) {
    if (!window.confirm(`¿Eliminar definitivamente la reserva ${b.id}? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: "DELETE" });
      setMsg({ k: "ok", t: "Reserva eliminada." });
      setDetail(null);
      load();
    } catch (e) {
      setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" });
    }
  }

  const setFilter = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setPage(1); setF({ ...f, [k]: e.target.value }); };
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <>
      <AdminTitle title="Gestión de citas">
        <button className="btn-gold" onClick={() => setModal({ booking: null })}>Nueva cita</button>
      </AdminTitle>
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <input className="input" placeholder="Buscar nombre, teléfono, correo o código" value={f.q} onChange={setFilter("q")} aria-label="Buscar" />
        <input className="input" type="date" value={f.date} onChange={setFilter("date")} aria-label="Fecha" />
        <select className="input" value={f.serviceId} onChange={setFilter("serviceId")} aria-label="Servicio">
          <option value="">Todos los servicios</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" value={f.status} onChange={setFilter("status")} aria-label="Estado">
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {!data ? <div className="h-48 animate-pulse bg-graphite" /> : data.items.length === 0 ? (
        <p className="border border-dashed border-steel p-8 text-center text-ash">No hay citas con estos filtros.</p>
      ) : (
        <>
          {/* Tabla (md+) */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-steel text-[11px] uppercase tracking-widest text-ash">
                <tr><th className="p-4">Fecha</th><th className="p-4">Cliente</th><th className="p-4">Servicio</th><th className="p-4">Precio</th><th className="p-4">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-steel">
                {data.items.map((b) => (
                  <tr key={b.id} className="cursor-pointer hover:bg-graphite" onClick={() => setDetail(b)}>
                    <td className="p-4 capitalize"><strong className="text-gold">{b.time}</strong> · {formatDateEs(b.date, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="p-4">{b.customer.firstName} {b.customer.lastName}<span className="block text-xs text-ash">{b.customer.phone}</span></td>
                    <td className="p-4">{b.service.name}</td>
                    <td className="p-4">{formatPrice(b.service.priceCents)}</td>
                    <td className="p-4"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Tarjetas (móvil) */}
          <ul className="space-y-3 md:hidden">
            {data.items.map((b) => (
              <li key={b.id}>
                <button className="card w-full space-y-2 p-4 text-left" onClick={() => setDetail(b)}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="capitalize"><strong className="text-gold">{b.time}</strong> · {formatDateEs(b.date, { day: "numeric", month: "short" })}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p>{b.customer.firstName} {b.customer.lastName}</p>
                  <p className="text-xs text-ash">{b.service.name} · {formatPrice(b.service.priceCents)}</p>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between text-sm text-ash">
            <span>{data.total} citas</span>
            <div className="flex items-center gap-3">
              <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span>{page} / {pages}</span>
              <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </div>
        </>
      )}

      {detail && (
        <Modal title={`Reserva ${detail.id}`} onClose={() => setDetail(null)}>
          <dl className="mb-6 divide-y divide-steel border-y border-steel text-sm">
            {[
              ["Cliente", `${detail.customer.firstName} ${detail.customer.lastName}`],
              ["Teléfono", detail.customer.phone],
              ["Correo", detail.customer.email],
              ["Servicio", `${detail.service.name} (${detail.service.durationMin} min)`],
              ["Precio acordado", formatPrice(detail.service.priceCents)],
              ["Fecha", `${formatDateEs(detail.date)} · ${detail.time}–${detail.endTime}`],
              ["Origen", detail.source === "web" ? "Web" : "Panel"],
              ["Notas", detail.notes || "—"],
            ].map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ash">{k}</dt><dd className="text-right">{v}</dd></div>)}
            <div className="flex items-center justify-between py-2.5"><dt className="text-ash">Estado</dt><dd><StatusBadge status={detail.status} /></dd></div>
          </dl>
          <div className="grid gap-2 sm:grid-cols-2">
            {detail.status === "pending" && <button className="btn-gold btn-sm" onClick={() => act(detail, { action: "status", status: "confirmed" }, "Cita confirmada.")}>Confirmar</button>}
            {(detail.status === "confirmed" || detail.status === "pending") && (
              <>
                <button className="btn-outline btn-sm" onClick={() => act(detail, { action: "status", status: "completed" }, "Marcada como completada.")}>Completada</button>
                <button className="btn-ghost btn-sm" onClick={() => act(detail, { action: "status", status: "no_show" }, "Marcada como no presentado.")}>No presentado</button>
                <button className="btn-ghost btn-sm" onClick={() => { setModal({ booking: detail }); setDetail(null); }}>Modificar</button>
                <button className="btn-ghost btn-sm" onClick={() => window.confirm("¿Cancelar esta cita? Se avisará al cliente por correo.") && act(detail, { action: "status", status: "cancelled" }, "Cita cancelada.")}>Cancelar cita</button>
              </>
            )}
            {(detail.status === "cancelled" || detail.status === "no_show") && <button className="btn-outline btn-sm" onClick={() => act(detail, { action: "status", status: "confirmed" }, "Cita reactivada.")}>Reactivar</button>}
            <button className="btn-ghost btn-sm !border-red-500/40 !text-red-300 hover:!bg-red-500/10" onClick={() => remove(detail)}>Eliminar registro</button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal.booking ? "Modificar cita" : "Nueva cita"} wide onClose={() => setModal(null)}>
          <BookingForm booking={modal.booking} onDone={() => { setModal(null); load(); }} />
        </Modal>
      )}
    </>
  );
}
