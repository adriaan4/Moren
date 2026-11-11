"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { formatDateEs } from "@/lib/time";
import type { Closure } from "@/types";
import { AdminTitle, Field, Notice, Toggle } from "./ui";

const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const KIND: Record<Closure["kind"], string> = { vacation: "Vacaciones", holiday: "Festivo", other: "Cierre extraordinario" };

export function VacationsManager() {
  const [list, setList] = useState<Closure[] | null>(null);
  const [f, setF] = useState({ kind: "vacation" as Closure["kind"], start: todayStr(), end: todayStr(), reason: "", message: "", showBanner: true });
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);

  const load = useCallback(async () => {
    try { setList((await api<{ closures: Closure[] }>("/api/admin/vacations")).closures); }
    catch (e) { setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    try {
      await api("/api/admin/vacations", { body: { ...f, message: f.message || undefined } });
      setMsg({ k: "ok", t: "Guardado. Esos días ya no admiten reservas y el aviso se muestra en la web." });
      setF({ ...f, reason: "", message: "" });
      await load();
    } catch (e) { setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" }); }
  }
  async function remove(c: Closure) {
    if (!window.confirm(`¿Quitar “${c.reason}”? Los días volverán a admitir reservas.`)) return;
    await api(`/api/admin/vacations?id=${c.id}`, { method: "DELETE" });
    await load();
  }

  const today = todayStr();
  const fmt = (d: string) => formatDateEs(d, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <AdminTitle title="Vacaciones y festivos" />
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}

      <section className="card mb-10 p-5 sm:p-6">
        <h2 className="mb-1 font-display text-xl">Programar un cierre</h2>
        <p className="mb-6 text-sm text-ash">Se bloquean automáticamente todos los días del rango. Las citas ya reservadas se conservan y siguen visibles aquí en el panel. Para cerrar solo una mañana, una tarde o unas horas, usa “Bloquear horas” en Horarios de apertura.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo">
            <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Closure["kind"] })}>
              {(Object.keys(KIND) as Closure["kind"][]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}
            </select>
          </Field>
          <Field label="Fecha de inicio"><input type="date" className="input" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value, end: e.target.value > f.end ? e.target.value : f.end })} /></Field>
          <Field label="Fecha de fin"><input type="date" className="input" min={f.start} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        </div>
        <div className="mt-4 grid gap-4">
          <Field label="Motivo del cierre"><input className="input" maxLength={120} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Vacaciones de verano" /></Field>
          <Field label="Mensaje en la web (opcional)"><input className="input" maxLength={300} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Reabrimos el lunes 1 de septiembre. ¡Gracias!" /></Field>
        </div>
        <div className="my-5 flex items-center gap-3"><Toggle checked={f.showBanner} onChange={(v) => setF({ ...f, showBanner: v })} label="Mostrar aviso" /><span className="text-sm">Mostrar aviso en la página principal</span></div>
        <button className="btn-gold" onClick={save} disabled={!f.reason.trim()}>Guardar cierre</button>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl">Cierres programados</h2>
        {!list ? <div className="h-32 animate-pulse bg-graphite" /> : list.length === 0 ? <p className="border border-dashed border-steel p-8 text-center text-ash">No hay cierres programados.</p> : (
          <ul className="space-y-3">
            {list.map((c) => (
              <li key={c.id} className={`card flex flex-wrap items-center justify-between gap-4 p-4 ${c.end < today ? "opacity-50" : ""}`}>
                <div>
                  <p className="font-display text-lg">{c.reason} <span className="text-xs uppercase tracking-widest text-ash">· {KIND[c.kind]}</span></p>
                  <p className="text-sm text-bone/80">{c.start === c.end ? fmt(c.start) : `${fmt(c.start)} → ${fmt(c.end)}`}{c.end < today ? " · pasado" : c.start <= today ? " · en curso" : ""}</p>
                  {c.message && <p className="mt-1 text-xs text-ash">“{c.message}”</p>}
                </div>
                <button className="btn-ghost btn-sm" onClick={() => remove(c)}>Quitar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
