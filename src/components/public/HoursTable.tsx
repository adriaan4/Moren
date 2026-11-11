import { formatWeekly } from "@/lib/format";
import type { WeeklySchedule } from "@/types";

export function HoursTable({ weekly, todayDow }: { weekly: WeeklySchedule; todayDow?: number }) {
  const rows = formatWeekly(weekly);
  const anyOpen = rows.some((r) => r.open);
  if (!anyOpen) return <p className="text-sm text-ash">Horario próximamente. Llámanos para consultar disponibilidad.</p>;
  return (
    <dl className="divide-y divide-steel border-y border-steel text-sm">
      {rows.map((r) => (
        <div key={r.dow} className={`flex items-baseline justify-between gap-4 py-2.5 ${r.dow === todayDow ? "text-gold" : ""}`}>
          <dt className="font-medium">{r.day}</dt>
          <dd className={r.open ? "text-right" : "text-right text-ash"}>{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}
