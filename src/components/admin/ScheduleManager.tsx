"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { DAY_NAMES, DAY_ORDER } from "@/lib/format";
import { formatDateEs } from "@/lib/time";
import type { Block, Range, ScheduleException, WeeklySchedule } from "@/types";
import { AdminTitle, Field, Notice, Toggle } from "./ui";

const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

function RangesEditor({ ranges, onChange }: { ranges: Range[]; onChange: (r: Range[]) => void }) {
  const set = (i: number, k: keyof Range, v: string) => onChange(ranges.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-2">
      {ranges.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input type="time" className="input !w-32" value={r.start} onChange={(e) => set(i, "start", e.target.value)} aria-label="Hora de apertura" />
          <span className="text-ash">a</span>
          <input type="time" className="input !w-32" value={r.end} onChange={(e) => set(i, "end", e.target.value)} aria-label="Hora de cierre" />
          <button type="button" className="btn-ghost btn-sm !px-3" onClick={() => onChange(ranges.filter((_, j) => j !== i))} aria-label="Quitar franja">✕</button>
        </div>
      ))}
      {ranges.length < 4 && (
        <button type="button" className="text-xs uppercase tracking-widest text-gold" onClick={() => onChange([...ranges, { start: ranges.length ? ranges[ranges.length - 1].end : "09:00", end: "14:00" }])}>
          + Añadir franja {ranges.length ? "(tras el descanso)" : ""}
        </button>
      )}
    </div>
  );
}

export function ScheduleManager() {
  const [weekly, setWeekly] = useState<WeeklySchedule | null>(null);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [ex, setEx] = useState({ from: todayStr(), to: "", closed: false, ranges: [{ start: "09:00", end: "14:00" }] as Range[], note: "" });
  const [bl, setBl] = useState({ date: todayStr(), start: "10:00", end: "11:00", reason: "", fullDay: false });

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([api<{ weekly: WeeklySchedule; exceptions: ScheduleException[] }>("/api/admin/schedule"), api<{ blocks: Block[] }>("/api/admin/blocks")]);
      setWeekly(s.weekly);
      setExceptions(s.exceptions.filter((e) => e.date >= todayStr()));
      setBlocks(b.blocks.filter((x) => x.date >= todayStr()));
    } catch (e) { setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const ok = (t: string) => setMsg({ k: "ok", t });
  const fail = (e: unknown) => setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" });

  async function saveWeekly() {
    if (!weekly) return;
    setBusy(true);
    try { await api("/api/admin/schedule", { method: "PUT", body: weekly }); ok("Horario semanal guardado y aplicado."); } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function addException() {
    try {
      await api("/api/admin/schedule/exceptions", { body: { dateFrom: ex.from, dateTo: ex.to || undefined, closed: ex.closed, ranges: ex.closed ? [] : ex.ranges, note: ex.note || undefined } });
      ok(ex.closed ? "Cierre guardado." : "Horario especial guardado.");
      await load();
    } catch (e) { fail(e); }
  }
  async function addBlock() {
    try {
      await api("/api/admin/blocks", { body: { date: bl.date, start: bl.fullDay ? "00:00" : bl.start, end: bl.fullDay ? "24:00" : bl.end, reason: bl.reason || undefined } });
      ok("Bloqueo guardado.");
      await load();
    } catch (e) { fail(e); }
  }

  if (!weekly) return <div className="h-64 animate-pulse bg-graphite" />;

  return (
    <>
      <AdminTitle title="Horarios de apertura" />
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}

      <section className="card mb-10 p-5 sm:p-6">
        <h2 className="mb-1 font-display text-xl">Horario semanal</h2>
        <p className="mb-6 text-sm text-ash">Añade dos franjas en un mismo día para definir el descanso de mediodía (p. ej. mañana y tarde).</p>
        <ul className="divide-y divide-steel">
          {DAY_ORDER.map((dow) => {
            const d = weekly[String(dow)] ?? { open: false, ranges: [] };
            const update = (patch: Partial<typeof d>) => setWeekly({ ...weekly, [String(dow)]: { ...d, ...patch } });
            return (
              <li key={dow} className="grid gap-3 py-4 md:grid-cols-[160px_1fr] md:items-start">
                <div className="flex items-center gap-3">
                  <Toggle checked={d.open} onChange={(v) => update({ open: v, ranges: v && !d.ranges.length ? [{ start: "09:00", end: "14:00" }, { start: "16:00", end: "20:00" }] : d.ranges })} label={`Abierto ${DAY_NAMES[dow]}`} />
                  <span className="font-medium">{DAY_NAMES[dow]}</span>
                </div>
                {d.open ? <RangesEditor ranges={d.ranges} onChange={(r) => update({ ranges: r })} /> : <p className="text-sm text-ash">Cerrado</p>}
              </li>
            );
          })}
        </ul>
        <button className="btn-gold mt-6" onClick={saveWeekly} disabled={busy}>{busy ? "Guardando…" : "Guardar horario semanal"}</button>
      </section>

      <section className="card mb-10 p-5 sm:p-6">
        <h2 className="mb-1 font-display text-xl">Excepciones y aperturas extraordinarias</h2>
        <p className="mb-6 text-sm text-ash">Para una fecha o un rango (p. ej. una semana con horario distinto, o abrir un domingo concreto). Tiene prioridad sobre el horario semanal.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Desde"><input type="date" className="input" value={ex.from} onChange={(e) => setEx({ ...ex, from: e.target.value })} /></Field>
          <Field label="Hasta (opcional)"><input type="date" className="input" value={ex.to} min={ex.from} onChange={(e) => setEx({ ...ex, to: e.target.value })} /></Field>
        </div>
        <div className="my-4 flex items-center gap-3"><Toggle checked={ex.closed} onChange={(v) => setEx({ ...ex, closed: v })} label="Cerrado" /><span className="text-sm">Cerrado ese día / rango</span></div>
        {!ex.closed && <div className="mb-4"><RangesEditor ranges={ex.ranges} onChange={(r) => setEx({ ...ex, ranges: r })} /></div>}
        <Field label="Nota (visible si está cerrado)"><input className="input" maxLength={120} value={ex.note} onChange={(e) => setEx({ ...ex, note: e.target.value })} /></Field>
        <button className="btn-gold mt-5" onClick={addException}>Guardar excepción</button>
        {exceptions.length > 0 && (
          <ul className="mt-6 divide-y divide-steel border-y border-steel text-sm">
            {exceptions.map((e) => (
              <li key={e.date} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="capitalize">{formatDateEs(e.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</span>
                <span className="text-bone/80">{e.closed ? `Cerrado${e.note ? ` · ${e.note}` : ""}` : e.ranges.map((r) => `${r.start}–${r.end}`).join(" · ")}</span>
                <button className="btn-ghost btn-sm" onClick={async () => { await api(`/api/admin/schedule/exceptions?date=${e.date}`, { method: "DELETE" }); await load(); }}>Quitar</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-1 font-display text-xl">Bloquear horas o un día</h2>
        <p className="mb-6 text-sm text-ash">Impide nuevas reservas en esas horas. No cancela las citas que ya existan.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fecha"><input type="date" className="input" value={bl.date} onChange={(e) => setBl({ ...bl, date: e.target.value })} /></Field>
          <Field label="Desde"><input type="time" className="input" disabled={bl.fullDay} value={bl.start} onChange={(e) => setBl({ ...bl, start: e.target.value })} /></Field>
          <Field label="Hasta"><input type="time" className="input" disabled={bl.fullDay} value={bl.end} onChange={(e) => setBl({ ...bl, end: e.target.value })} /></Field>
        </div>
        <div className="my-4 flex items-center gap-3"><Toggle checked={bl.fullDay} onChange={(v) => setBl({ ...bl, fullDay: v })} label="Todo el día" /><span className="text-sm">Todo el día</span></div>
        <Field label="Motivo (opcional)"><input className="input" maxLength={120} value={bl.reason} onChange={(e) => setBl({ ...bl, reason: e.target.value })} /></Field>
        <button className="btn-gold mt-5" onClick={addBlock}>Bloquear</button>
        {blocks.length > 0 && (
          <ul className="mt-6 divide-y divide-steel border-y border-steel text-sm">
            {blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="capitalize">{formatDateEs(b.date, { weekday: "short", day: "numeric", month: "long" })}</span>
                <span>{b.start === "00:00" && b.end === "24:00" ? "Todo el día" : `${b.start}–${b.end}`}{b.reason ? ` · ${b.reason}` : ""}</span>
                <button className="btn-ghost btn-sm" onClick={async () => { await api(`/api/admin/blocks?id=${b.id}`, { method: "DELETE" }); await load(); }}>Quitar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
