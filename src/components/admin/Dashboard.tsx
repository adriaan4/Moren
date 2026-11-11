"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { formatDateEs, formatPrice } from "@/lib/time";
import type { getStats } from "@/services/statsService";
import { AdminTitle, BarChart, Notice, StatusBadge } from "./ui";

type Stats = Awaited<ReturnType<typeof getStats>>;

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="label !mb-2">{label}</p>
      <p className="font-display text-3xl text-gold">{value}</p>
      {sub && <p className="mt-1 text-xs text-ash">{sub}</p>}
    </div>
  );
}

export function Dashboard({ full = false }: { full?: boolean }) {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  useEffect(() => {
    api<Stats>("/api/admin/stats").then(setS).catch((e) => setErr(e.message));
  }, []);

  if (err) return <Notice kind="err">{err}</Notice>;
  if (!s) return <div className="h-64 animate-pulse bg-graphite" />;

  const series = period === "day" ? s.perDay : period === "week" ? s.perWeek : s.perMonth;
  const labels = series.map((d) => (period === "month" ? d.label.slice(5) + "/" + d.label.slice(2, 4) : d.label.slice(8) + "/" + d.label.slice(5, 7)));
  const chart = series.map((d, i) => ({ label: labels[i], count: d.count }));

  return (
    <>
      <AdminTitle title={full ? "Estadísticas" : "Dashboard"} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Stat label="Citas de hoy" value={s.today.length} />
        <Stat label="Pendientes" value={s.byStatus.pending} />
        <Stat label="Confirmadas" value={s.byStatus.confirmed} />
        <Stat label="Completadas" value={s.byStatus.completed} />
        <Stat label="Canceladas" value={s.byStatus.cancelled} />
        <Stat label="No presentados" value={s.byStatus.no_show} />
        <Stat label="Clientes" value={s.totalCustomers} />
        <Stat label="Esta semana" value={s.week.total} sub={`Facturado: ${formatPrice(s.week.revenueCents)}`} />
        <Stat label="Este mes" value={s.month.total} sub={`Facturado: ${formatPrice(s.month.revenueCents)}`} />
      </div>

      <section className="card mt-8 p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">Reservas por {period === "day" ? "día (30 días)" : period === "week" ? "semana (12 semanas)" : "mes (12 meses)"}</h2>
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`btn-sm btn ${period === p ? "bg-gold text-ink" : "border border-steel"}`}>
                {p === "day" ? "Día" : p === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={chart} height={full ? 220 : 160} showEvery={period === "day" ? 5 : 2} />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl">Hoy</h2>
          {s.today.length === 0 ? <p className="text-sm text-ash">No hay citas hoy.</p> : (
            <ul className="divide-y divide-steel text-sm">
              {s.today.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <span><strong className="text-gold">{b.time}</strong> · {b.customer.firstName} {b.customer.lastName}<span className="block text-xs text-ash">{b.service.name}</span></span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl">Próximas citas</h2>
          {s.upcoming.length === 0 ? <p className="text-sm text-ash">No hay citas próximas.</p> : (
            <ul className="divide-y divide-steel text-sm">
              {s.upcoming.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <span><strong className="capitalize text-gold">{formatDateEs(b.date, { weekday: "short", day: "numeric", month: "short" })} {b.time}</strong> · {b.customer.firstName} {b.customer.lastName}<span className="block text-xs text-ash">{b.service.name}</span></span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/citas" className="btn-ghost btn-sm mt-5">Ver todas</Link>
        </section>
      </div>

      {full && s.topServices.length > 0 && (
        <section className="card mt-8 p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl">Servicios más reservados</h2>
          <ul className="space-y-3 text-sm">
            {s.topServices.map((t) => {
              const max = s.topServices[0].count;
              return (
                <li key={t.name}>
                  <div className="mb-1 flex justify-between"><span>{t.name}</span><span className="text-gold">{t.count}</span></div>
                  <div className="h-1.5 bg-graphite"><div className="h-full bg-gold" style={{ width: `${(t.count / max) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
