"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconChevron } from "@/components/ui/Icons";
import { api } from "@/lib/client/api";
import { addDays, dayOfWeek, formatDateEs, monthDates } from "@/lib/time";
import type { Block, Booking } from "@/types";
import { AdminTitle, Modal, Notice, StatusBadge } from "./ui";

interface DayInfo {
  date: string;
  open: boolean;
  ranges: { start: string; end: string }[];
  closedLabel?: string;
  closedBy?: string;
  blocks: Block[];
}
type View = "day" | "week" | "month";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const mondayOf = (d: string) => addDays(d, -((dayOfWeek(d) + 6) % 7));

function rangeFor(view: View, anchor: string): [string, string] {
  if (view === "day") return [anchor, anchor];
  if (view === "week") {
    const m = mondayOf(anchor);
    return [m, addDays(m, 6)];
  }
  const dates = monthDates(anchor.slice(0, 7));
  const first = mondayOf(dates[0]);
  return [first, addDays(first, 41)];
}

export function CalendarView() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(today());
  const [data, setData] = useState<{ bookings: Booking[]; days: DayInfo[] } | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<Booking | null>(null);

  const [from, to] = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  useEffect(() => {
    setData(null);
    api<{ bookings: Booking[]; days: DayInfo[] }>(`/api/admin/calendar?from=${from}&to=${to}`).then(setData).catch((e) => setErr(e.message));
  }, [from, to]);

  const byDate = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of data?.bookings ?? []) m.set(b.date, [...(m.get(b.date) ?? []), b]);
    return m;
  }, [data]);
  const dayInfo = (d: string) => data?.days.find((x) => x.date === d);

  function shift(dir: 1 | -1) {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, 7 * dir));
    else {
      const [y, m] = anchor.split("-").map(Number);
      setAnchor(new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10));
    }
  }

  const title = view === "day" ? formatDateEs(anchor) : view === "week" ? `${formatDateEs(from, { day: "numeric", month: "short" })} – ${formatDateEs(to, { day: "numeric", month: "short", year: "numeric" })}` : formatDateEs(anchor, { month: "long", year: "numeric" });

  const DayCard = ({ date, compact }: { date: string; compact?: boolean }) => {
    const info = dayInfo(date);
    const list = (byDate.get(date) ?? []).filter((b) => b.status !== "cancelled" || view === "day");
    return (
      <div className={`card min-w-0 ${compact ? "p-3" : "p-5"} ${date === today() ? "!border-gold/60" : ""}`}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="font-display capitalize">{formatDateEs(date, { weekday: "long", day: "numeric", month: "short" })}</h3>
          <button className="text-[10px] uppercase tracking-widest text-gold" onClick={() => { setAnchor(date); setView("day"); }}>Día</button>
        </div>
        {info && (
          <p className={`mb-3 text-xs ${info.open ? "text-ash" : "text-red-300"}`}>
            {info.open ? info.ranges.map((r) => `${r.start}–${r.end}`).join(" · ") : `Cerrado${info.closedLabel ? ` · ${info.closedLabel}` : ""}`}
            {info.blocks.map((b) => <span key={b.id} className="block text-amber-300">Bloqueo {b.start}–{b.end}{b.reason ? ` · ${b.reason}` : ""}</span>)}
          </p>
        )}
        {list.length === 0 ? <p className="text-xs text-ash/60">Sin citas</p> : (
          <ul className="space-y-1.5">
            {list.map((b) => (
              <li key={b.id}>
                <button onClick={() => setSel(b)} className={`w-full border-l-2 bg-graphite px-3 py-2 text-left text-xs transition hover:bg-steel ${b.status === "cancelled" ? "border-red-500/60 opacity-60" : b.status === "pending" ? "border-amber-400" : "border-gold"}`}>
                  <strong className="text-gold">{b.time}</strong> {b.customer.firstName} {b.customer.lastName}
                  <span className="block truncate text-ash">{b.service.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <>
      <AdminTitle title="Calendario">
        {(["day", "week", "month"] as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`btn btn-sm ${view === v ? "bg-gold text-ink" : "border border-steel"}`}>{v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}</button>
        ))}
      </AdminTitle>
      {err && <Notice kind="err">{err}</Notice>}

      <div className="mb-6 flex items-center justify-between gap-3">
        <button className="flex h-12 w-12 items-center justify-center border border-steel hover:border-gold" onClick={() => shift(-1)} aria-label="Anterior"><IconChevron dir="left" /></button>
        <div className="text-center">
          <p className="font-display text-xl capitalize sm:text-2xl">{title}</p>
          <button className="text-[11px] uppercase tracking-widest text-gold" onClick={() => setAnchor(today())}>Hoy</button>
        </div>
        <button className="flex h-12 w-12 items-center justify-center border border-steel hover:border-gold" onClick={() => shift(1)} aria-label="Siguiente"><IconChevron /></button>
      </div>

      {!data ? <div className="h-72 animate-pulse bg-graphite" /> : view === "day" ? (
        <div className="max-w-2xl"><DayCard date={anchor} /></div>
      ) : view === "week" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => <DayCard key={d} date={d} compact />)}
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-7 gap-1 md:grid">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <p key={d} className="py-2 text-center text-[11px] uppercase tracking-widest text-ash">{d}</p>)}
            {Array.from({ length: 42 }, (_, i) => addDays(from, i)).map((d) => {
              const info = dayInfo(d);
              const n = (byDate.get(d) ?? []).filter((b) => b.status === "confirmed" || b.status === "pending" || b.status === "completed").length;
              const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
              return (
                <button key={d} onClick={() => { setAnchor(d); setView("day"); }} className={`min-h-[92px] border p-2 text-left text-xs transition hover:border-gold ${inMonth ? "border-steel bg-coal" : "border-transparent bg-ink/40 text-ash/50"} ${d === today() ? "!border-gold" : ""}`}>
                  <span className="font-semibold">{Number(d.slice(8))}</span>
                  {info && !info.open && inMonth && <span className="mt-1 block truncate text-[10px] text-red-300">{info.closedLabel ?? "Cerrado"}</span>}
                  {n > 0 && <span className="mt-1 block bg-gold/20 px-1.5 py-0.5 text-gold">{n} {n === 1 ? "cita" : "citas"}</span>}
                </button>
              );
            })}
          </div>
          {/* Móvil: el mes se convierte en lista de días con citas */}
          <ul className="space-y-3 md:hidden">
            {monthDates(anchor.slice(0, 7)).map((d) => {
              const list = byDate.get(d) ?? [];
              const info = dayInfo(d);
              if (!list.length && info?.open !== false) return null;
              return <li key={d}><DayCard date={d} compact /></li>;
            })}
          </ul>
        </>
      )}

      {sel && (
        <Modal title={`Reserva ${sel.id}`} onClose={() => setSel(null)}>
          <dl className="mb-6 divide-y divide-steel border-y border-steel text-sm">
            {[["Cliente", `${sel.customer.firstName} ${sel.customer.lastName}`], ["Teléfono", sel.customer.phone], ["Servicio", sel.service.name], ["Hora", `${sel.time}–${sel.endTime}`], ["Notas", sel.notes || "—"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ash">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
            <div className="flex justify-between py-2.5"><dt className="text-ash">Estado</dt><dd><StatusBadge status={sel.status} /></dd></div>
          </dl>
          <Link href={`/admin/citas?q=${sel.id}`} className="btn-gold w-full">Gestionar esta cita</Link>
        </Modal>
      )}
    </>
  );
}
