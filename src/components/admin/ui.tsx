"use client";

import { useEffect } from "react";
import { IconClose } from "@/components/ui/Icons";
import type { BookingStatus } from "@/types";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No presentado",
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "border-amber-500/50 text-amber-300 bg-amber-500/10",
  confirmed: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10",
  cancelled: "border-red-500/50 text-red-300 bg-red-500/10",
  completed: "border-sky-500/50 text-sky-300 bg-sky-500/10",
  no_show: "border-ash/50 text-ash bg-ash/10",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`inline-block border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function AdminTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        <div className="gold-rule mt-3" />
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[92dvh] w-full overflow-y-auto border border-steel bg-coal p-5 sm:p-8 ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center hover:text-gold" aria-label="Cerrar"><IconClose /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  return <p role={kind === "err" ? "alert" : "status"} className={`mb-6 border p-4 text-sm ${kind === "ok" ? "border-gold/40 bg-gold/10 text-gold-light" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>{children}</p>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ash">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 border transition ${checked ? "border-gold bg-gold" : "border-steel bg-graphite"}`}>
      <span className={`absolute top-0.5 h-5 w-5 transition-all ${checked ? "left-[26px] bg-ink" : "left-0.5 bg-ash"}`} />
    </button>
  );
}

/** Gráfico de barras en SVG sin dependencias. */
export function BarChart({ data, height = 160, showEvery = 1 }: { data: { label: string; count: number }[]; height?: number; showEvery?: number }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="w-full overflow-hidden" role="img" aria-label="Gráfico de reservas">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.count}`}>
            <div className="w-full bg-gold/80 transition group-hover:bg-gold-light" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 3 : 1, opacity: d.count ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[9px] text-ash">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center">{i % showEvery === 0 ? d.label : ""}</span>
        ))}
      </div>
    </div>
  );
}
