"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { formatDateEs, formatPrice } from "@/lib/time";
import type { Booking, Customer } from "@/types";
import { AdminTitle, Field, Modal, Notice, StatusBadge } from "./ui";

interface Stats { total: number; completed: number; cancelled: number; noShows: number; lastVisit: string | null; avgDaysBetweenVisits: number | null }
type Row = Customer & { stats: Stats };
interface Detail { customer: Customer; bookings: Booking[]; stats: Stats }

export function CustomersManager() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [edit, setEdit] = useState<Customer | null>(null);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);

  const load = useCallback(async () => {
    try { setRows((await api<{ customers: Row[] }>(`/api/admin/customers?q=${encodeURIComponent(q)}`)).customers); }
    catch (e) { setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" }); }
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const open = async (id: string) => setDetail(await api<Detail>(`/api/admin/customers/${id}`));

  async function save() {
    if (!edit) return;
    try {
      await api(`/api/admin/customers/${edit.id}`, { method: "PATCH", body: { firstName: edit.firstName, lastName: edit.lastName, phone: edit.phone, email: edit.email, notes: edit.notes ?? "" } });
      setEdit(null);
      setMsg({ k: "ok", t: "Datos del cliente actualizados." });
      load();
      if (detail) open(detail.customer.id);
    } catch (e) { setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" }); }
  }

  async function erase(c: Customer) {
    if (!window.confirm(`¿Eliminar a ${c.firstName} ${c.lastName}? Se borran sus datos personales y su historial queda anonimizado (RGPD). No se puede deshacer.`)) return;
    await api(`/api/admin/customers/${c.id}`, { method: "DELETE" });
    setDetail(null);
    setMsg({ k: "ok", t: "Cliente eliminado y datos anonimizados." });
    load();
  }

  return (
    <>
      <AdminTitle title="Clientes" />
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}
      <input className="input mb-6 max-w-md" placeholder="Buscar por nombre, teléfono o correo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar clientes" />

      {!rows ? <div className="h-48 animate-pulse bg-graphite" /> : rows.length === 0 ? <p className="border border-dashed border-steel p-8 text-center text-ash">Aún no hay clientes.</p> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <li key={c.id}>
              <button onClick={() => open(c.id)} className="card w-full space-y-1 p-4 text-left transition hover:border-gold/60">
                <p className="font-display text-lg">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-ash">{c.phone} · {c.email}</p>
                <p className="pt-2 text-xs text-bone/70">{c.stats.total} citas · {c.stats.completed} completadas{c.stats.lastVisit ? ` · última: ${formatDateEs(c.stats.lastVisit, { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail && !edit && (
        <Modal title={`${detail.customer.firstName} ${detail.customer.lastName}`} wide onClose={() => setDetail(null)}>
          <div className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
            <p><span className="text-ash">Teléfono:</span> {detail.customer.phone}</p>
            <p><span className="text-ash">Correo:</span> {detail.customer.email}</p>
            <p><span className="text-ash">Visitas completadas:</span> {detail.stats.completed}</p>
            <p><span className="text-ash">Frecuencia media:</span> {detail.stats.avgDaysBetweenVisits ? `cada ${detail.stats.avgDaysBetweenVisits} días` : "—"}</p>
            <p><span className="text-ash">Cancelaciones:</span> {detail.stats.cancelled}</p>
            <p><span className="text-ash">No presentado:</span> {detail.stats.noShows}</p>
            {detail.customer.notes && <p className="sm:col-span-2"><span className="text-ash">Notas:</span> {detail.customer.notes}</p>}
          </div>
          <h3 className="mb-3 font-display text-lg">Historial y próximas citas</h3>
          <ul className="mb-6 divide-y divide-steel border-y border-steel text-sm">
            {detail.bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="capitalize">{formatDateEs(b.date, { day: "numeric", month: "short", year: "numeric" })} · {b.time}</span>
                <span>{b.service.name} · {formatPrice(b.service.priceCents)}</span>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={() => setEdit(detail.customer)}>Editar datos</button>
            <button className="btn-ghost btn-sm !border-red-500/40 !text-red-300" onClick={() => erase(detail.customer)}>Eliminar (RGPD)</button>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal title="Editar cliente" onClose={() => setEdit(null)}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre"><input className="input" value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} /></Field>
              <Field label="Apellidos"><input className="input" value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} /></Field>
              <Field label="Teléfono"><input className="input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
              <Field label="Correo"><input className="input" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            </div>
            <Field label="Notas internas"><textarea className="input min-h-[80px] py-3" value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-3"><button className="btn-ghost" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-gold" onClick={save}>Guardar</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}
