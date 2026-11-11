"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { formatPrice } from "@/lib/time";
import type { Service } from "@/types";
import { ImageUpload } from "./ImageUpload";
import { AdminTitle, Field, Modal, Notice, Toggle } from "./ui";

interface Draft {
  id?: string;
  name: string;
  price: string; // euros, texto libre ("12,50")
  duration: string;
  description: string;
  imageUrl: string;
  active: boolean;
}

const EMPTY: Draft = { name: "", price: "", duration: "", description: "", imageUrl: "", active: true };
const toCents = (v: string) => Math.round(parseFloat(v.replace(",", ".")) * 100);

/**
 * mode="full": gestión completa de servicios (descripción, foto, duración…).
 * mode="prices": vista rápida centrada en nombre y precio.
 */
export function ServicesManager({ mode }: { mode: "full" | "prices" }) {
  const [list, setList] = useState<Service[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setList((await api<{ services: Service[] }>("/api/admin/services")).services); }
    catch (e) { setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const flash = (t: string) => setMsg({ k: "ok", t });
  const fail = (e: unknown) => setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" });

  async function save() {
    if (!draft) return;
    const priceCents = toCents(draft.price);
    if (!draft.name.trim()) return setMsg({ k: "err", t: "Escribe el nombre del servicio." });
    if (!Number.isFinite(priceCents) || priceCents < 0) return setMsg({ k: "err", t: "Introduce un precio válido (p. ej. 12,50)." });
    const body = {
      name: draft.name.trim(),
      priceCents,
      durationMin: draft.duration ? Number(draft.duration) : undefined,
      description: draft.description.trim() || undefined,
      imageUrl: draft.imageUrl || undefined,
      active: draft.active,
    };
    setBusy(true);
    try {
      if (draft.id) {
        // En edición, los campos vaciados se envían explícitamente para borrarlos
        await api(`/api/admin/services/${draft.id}`, {
          method: "PATCH",
          body: { ...body, durationMin: draft.duration ? Number(draft.duration) : null, description: draft.description.trim(), imageUrl: draft.imageUrl },
        });
      }
      else await api("/api/admin/services", { body });
      flash(draft.id ? "Servicio actualizado. La web pública ya muestra los cambios." : "Servicio creado y publicado.");
      setDraft(null);
      await load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function toggle(s: Service) {
    try { await api(`/api/admin/services/${s.id}`, { method: "PATCH", body: { active: !s.active } }); await load(); } catch (e) { fail(e); }
  }
  async function remove(s: Service) {
    if (!window.confirm(`¿Eliminar “${s.name}”? Las citas ya reservadas conservarán su nombre y precio.`)) return;
    try { await api(`/api/admin/services/${s.id}`, { method: "DELETE" }); flash("Servicio eliminado."); await load(); } catch (e) { fail(e); }
  }
  async function move(i: number, dir: -1 | 1) {
    if (!list) return;
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    try { await api("/api/admin/services", { method: "PUT", body: { ids: next.map((s) => s.id) } }); } catch (e) { fail(e); await load(); }
  }
  async function quickPrice(s: Service, value: string) {
    const cents = toCents(value);
    if (!Number.isFinite(cents) || cents === s.priceCents) return;
    try { await api(`/api/admin/services/${s.id}`, { method: "PATCH", body: { priceCents: cents } }); flash(`Precio de “${s.name}” actualizado.`); await load(); } catch (e) { fail(e); }
  }

  const edit = (s: Service) => setDraft({ id: s.id, name: s.name, price: (s.priceCents / 100).toFixed(2).replace(".", ","), duration: s.durationMin ? String(s.durationMin) : "", description: s.description ?? "", imageUrl: s.imageUrl ?? "", active: s.active });

  return (
    <>
      <AdminTitle title={mode === "full" ? "Gestión de servicios" : "Gestión de precios y servicios"}>
        <button className="btn-gold" onClick={() => setDraft({ ...EMPTY })}>Añadir servicio</button>
      </AdminTitle>
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}
      <p className="mb-6 max-w-2xl text-sm text-ash">Los cambios se publican al instante en la web y en el formulario de reservas. Las citas ya reservadas conservan el nombre, precio y duración acordados.</p>

      {!list ? <div className="h-48 animate-pulse bg-graphite" /> : list.length === 0 ? (
        <p className="border border-dashed border-steel p-10 text-center text-ash">Todavía no hay servicios. Pulsa “Añadir servicio”: solo necesitas el nombre y el precio.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((s, i) => (
            <li key={s.id} className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${s.active ? "" : "opacity-60"}`}>
              <div className="flex flex-1 items-center gap-4">
                {mode === "full" && s.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" className="h-14 w-14 shrink-0 object-cover" />
                )}
                <div className="min-w-0">
                  <p className="font-display text-lg">{s.name}</p>
                  <p className="text-xs text-ash">{s.durationMin ? `${s.durationMin} min` : "Duración por defecto"}{!s.active ? " · Desactivado" : ""}</p>
                </div>
              </div>
              {mode === "prices" ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-ash">€</span>
                  <input className="input !min-h-[44px] w-28" defaultValue={(s.priceCents / 100).toFixed(2).replace(".", ",")} inputMode="decimal" aria-label={`Precio de ${s.name}`}
                    onBlur={(e) => quickPrice(s, e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
                </label>
              ) : <span className="font-display text-xl text-gold">{formatPrice(s.priceCents)}</span>}
              <div className="flex flex-wrap items-center gap-2">
                <Toggle checked={s.active} onChange={() => toggle(s)} label={`Activar ${s.name}`} />
                <button className="btn-ghost btn-sm !px-3" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                <button className="btn-ghost btn-sm !px-3" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Bajar">↓</button>
                <button className="btn-outline btn-sm" onClick={() => edit(s)}>Editar</button>
                <button className="btn-ghost btn-sm !border-red-500/40 !text-red-300" onClick={() => remove(s)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <Modal title={draft.id ? "Editar servicio" : "Nuevo servicio"} onClose={() => setDraft(null)}>
          <div className="space-y-5">
            <Field label="Nombre del servicio *"><input className="input" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Precio (€) *"><input className="input" inputMode="decimal" placeholder="0,00" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></Field>
            <details className="border border-steel p-4" open={!!draft.id}>
              <summary className="cursor-pointer text-xs uppercase tracking-widest text-gold">Campos opcionales</summary>
              <div className="mt-4 space-y-5">
                <Field label="Duración (minutos)" hint="Si lo dejas vacío se usa la duración por defecto de Configuración."><input className="input" inputMode="numeric" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value.replace(/\D/g, "") })} /></Field>
                <Field label="Descripción"><textarea className="input min-h-[90px] py-3" maxLength={400} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
                <Field label="Fotografía"><ImageUpload value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} /></Field>
                <div className="flex items-center gap-3"><Toggle checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Activo" /><span className="text-sm">Visible en la web</span></div>
              </div>
            </details>
            <div className="flex justify-end gap-3"><button className="btn-ghost" onClick={() => setDraft(null)}>Cancelar</button><button className="btn-gold" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar servicio"}</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}
