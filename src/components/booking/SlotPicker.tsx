"use client";

import { useEffect, useMemo, useState } from "react";
import { IconChevron } from "@/components/ui/Icons";
import { api } from "@/lib/client/api";
import { formatDateEs } from "@/lib/time";
import type { DayOverview } from "@/types";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

interface Props {
  serviceId: string;
  value: { date: string | null; time: string | null };
  onChange: (v: { date: string | null; time: string | null }) => void;
  /** Reserva que se está modificando: su propio hueco cuenta como libre */
  excludeBookingId?: string;
  /** Endpoint de disponibilidad (el panel usa uno que no aplica antelación mínima ni límite de días) */
  endpoint?: string;
}

/** Calendario mensual + horas libres. Todo viene del backend: aquí solo se pinta. */
export function SlotPicker({ serviceId, value, onChange, excludeBookingId, endpoint = "/api/availability" }: Props) {
  const [month, setMonth] = useState((value.date ?? todayLocal()).slice(0, 7));
  const [days, setDays] = useState<DayOverview[] | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  const qs = (extra: string) => `${endpoint}?serviceId=${encodeURIComponent(serviceId)}${excludeBookingId ? `&exclude=${excludeBookingId}` : ""}&${extra}`;

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    api<{ days: DayOverview[] }>(qs(`month=${month}`))
      .then((r) => !cancelled && setDays(r.days))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, serviceId, excludeBookingId]);

  useEffect(() => {
    if (!value.date) return setSlots(null);
    let cancelled = false;
    setSlots(null);
    api<{ slots: string[] }>(qs(`date=${value.date}`))
      .then((r) => !cancelled && setSlots(r.slots))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.date, serviceId, excludeBookingId]);

  const grid = useMemo(() => {
    if (!days) return [];
    const first = new Date(`${month}-01T00:00:00Z`).getUTCDay();
    const offset = (first + 6) % 7;
    return [...Array<null>(offset).fill(null), ...days];
  }, [days, month]);

  const monthLabel = formatDateEs(`${month}-01`, { month: "long", year: "numeric" });
  const thisMonth = todayLocal().slice(0, 7);

  const groups = useMemo(() => {
    if (!slots) return [];
    const morning = slots.filter((s) => s < "14:00");
    const afternoon = slots.filter((s) => s >= "14:00");
    return [
      { label: "Mañana", items: morning },
      { label: "Tarde", items: afternoon },
    ].filter((g) => g.items.length);
  }, [slots]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button type="button" className="flex h-12 w-12 items-center justify-center border border-steel hover:border-gold disabled:opacity-30" onClick={() => setMonth(shiftMonth(month, -1))} disabled={month <= thisMonth} aria-label="Mes anterior">
            <IconChevron dir="left" />
          </button>
          <p className="font-display text-xl capitalize">{monthLabel}</p>
          <button type="button" className="flex h-12 w-12 items-center justify-center border border-steel hover:border-gold" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
            <IconChevron />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-widest text-ash">
          {WEEKDAYS.map((d) => <span key={d} className="py-2">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendario de ${monthLabel}`}>
          {days === null
            ? Array.from({ length: 35 }).map((_, i) => <span key={i} className="aspect-square animate-pulse bg-graphite" />)
            : grid.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const selectable = d.status === "available";
                const selected = value.date === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={!selectable}
                    onClick={() => onChange({ date: d.date, time: null })}
                    title={d.label ?? (d.status === "full" ? "Completo" : d.status === "closed" ? "Cerrado" : undefined)}
                    aria-pressed={selected}
                    className={`relative flex aspect-square min-h-[44px] items-center justify-center text-sm transition
                      ${selected ? "bg-gold font-semibold text-ink" : selectable ? "border border-steel bg-coal hover:border-gold hover:text-gold" : "cursor-not-allowed text-ash/40"}
                      ${d.status === "closed" && !selected ? "line-through decoration-ash/30" : ""}`}
                  >
                    {Number(d.date.slice(8))}
                    {d.status === "full" && <span className="absolute bottom-1 h-[3px] w-[3px] rounded-full bg-ash/60" />}
                  </button>
                );
              })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ash">
          <li className="flex items-center gap-2"><span className="h-3 w-3 border border-steel bg-coal" />Disponible</li>
          <li className="flex items-center gap-2"><span className="h-3 w-3 bg-gold" />Seleccionado</li>
          <li className="flex items-center gap-2"><span className="text-ash/40 line-through">12</span>Cerrado / completo</li>
        </ul>
      </div>

      <div>
        <p className="label">Horas disponibles</p>
        {error && <p className="mb-3 text-sm text-red-400" role="alert">{error}</p>}
        {!value.date ? (
          <p className="border border-dashed border-steel p-6 text-sm text-ash">Elige un día en el calendario para ver las horas libres.</p>
        ) : slots === null ? (
          <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, i) => <span key={i} className="h-12 animate-pulse bg-graphite" />)}</div>
        ) : slots.length === 0 ? (
          <p className="border border-dashed border-steel p-6 text-sm text-ash">No quedan horas libres ese día. Prueba con otro.</p>
        ) : (
          <div className="space-y-5">
            <p className="text-sm capitalize text-bone/80">{formatDateEs(value.date)}</p>
            {groups.map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-[11px] uppercase tracking-widest text-ash">{g.label}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {g.items.map((t) => (
                    <button key={t} type="button" aria-pressed={value.time === t} onClick={() => onChange({ date: value.date, time: t })}
                      className={`min-h-[48px] border text-sm transition ${value.time === t ? "border-gold bg-gold font-semibold text-ink" : "border-steel bg-coal hover:border-gold hover:text-gold"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
